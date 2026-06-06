import { collectPatchEvidence } from "./evidence.js";
import { hashDocumentBase, stableStringify } from "./hashing.js";
import { collectReferencedLatticeLaws, hasAutoMergeLawSet } from "./lattice.js";
import { summarizePatch } from "./patch-summary.js";
import { intersection, unique } from "./shared.js";
import { validateDocument } from "./document-validation.js";

export function createPatch(input) {
  return {
    ...input,
    kind: "frontier.lang.patch",
    version: 1
  };
}

export function applySemanticPatch(document, patch, event) {
  if (patch.baseHash && patch.baseHash !== hashDocumentBase(document)) {
    throw new Error(`Patch ${patch.id} base hash does not match document`);
  }

  let nodes = { ...document.nodes };
  let rootIds = [...document.rootIds];

  for (const operation of patch.operations) {
    switch (operation.op) {
      case "upsertNode": {
        nodes = { ...nodes, [operation.node.id]: operation.node };
        if (!operation.node.parentId && !rootIds.includes(operation.node.id)) {
          rootIds = [...rootIds, operation.node.id];
        }
        break;
      }
      case "removeNode": {
        const nextNodes = { ...nodes };
        delete nextNodes[operation.id];
        nodes = nextNodes;
        rootIds = rootIds.filter((id) => id !== operation.id);
        break;
      }
      case "renameNode": {
        const node = requireNode(nodes, operation.id);
        nodes = { ...nodes, [operation.id]: { ...node, name: operation.name } };
        break;
      }
      case "moveNode": {
        const node = requireNode(nodes, operation.id);
        nodes = { ...nodes, [operation.id]: { ...node, parentId: operation.parentId } };
        rootIds = operation.parentId
          ? rootIds.filter((id) => id !== operation.id)
          : unique([...rootIds, operation.id]);
        break;
      }
      case "updateNode": {
        if (
          Object.hasOwn(operation.set, "id") ||
          Object.hasOwn(operation.set, "kind") ||
          Object.hasOwn(operation.set, "parentId")
        ) {
          throw new Error(`Patch ${patch.id} cannot update semantic node identity, kind, or parent`);
        }
        const node = requireNode(nodes, operation.id);
        nodes = { ...nodes, [operation.id]: { ...node, ...operation.set } };
        break;
      }
      case "addEvidence":
        break;
      default:
        throw new Error(`Unexpected operation: ${operation.op}`);
    }
  }

  const next = {
    ...document,
    rootIds,
    nodes
  };

  const issues = validateDocument(next);
  if (issues.length > 0) {
    throw new Error(`Invalid document after patch ${patch.id}: ${issues.join("; ")}`);
  }

  if (patch.targetHash && patch.targetHash !== hashDocumentBase(next)) {
    throw new Error(`Patch ${patch.id} target hash does not match result`);
  }

  return {
    ...next,
    history: [
      ...(document.history ?? []),
      event ?? {
        id: `event:${patch.id}`,
        patch
      }
    ]
  };
}

export function replayDocument(initial, events) {
  return events.reduce((document, event) => applySemanticPatch(document, event.patch, event), initial);
}

export function classifyMerge(base, left, right) {
  const baseHash = hashDocumentBase(base);
  const reasons = [];

  if (left.baseHash && left.baseHash !== baseHash) {
    reasons.push(`Left patch base hash ${left.baseHash} does not match current base ${baseHash}`);
  }
  if (right.baseHash && right.baseHash !== baseHash) {
    reasons.push(`Right patch base hash ${right.baseHash} does not match current base ${baseHash}`);
  }

  validatePatchAgainstBase(base, left, "Left", reasons);
  validatePatchAgainstBase(base, right, "Right", reasons);

  const leftSummary = summarizePatch(left);
  const rightSummary = summarizePatch(right);
  const overlappingNodeIds = intersection(leftSummary.nodeIds, rightSummary.nodeIds);
  const overlappingRegions = intersection(leftSummary.regions, rightSummary.regions);
  const overlappingEffects = intersection(leftSummary.effects, rightSummary.effects);
  const evidence = [...collectPatchEvidence(left), ...collectPatchEvidence(right)];
  const failedEvidence = evidence.filter((record) => record.status === "failed");

  if (reasons.length > 0) {
    return {
      status: "unknown-needs-review",
      autoMergeable: false,
      reasons,
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (failedEvidence.length > 0) {
    return {
      status: "unknown-needs-review",
      autoMergeable: false,
      reasons: [`Failed evidence prevents auto-merge: ${failedEvidence.map((record) => record.id).join(", ")}`],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (stableStringify(left.operations) === stableStringify(right.operations)) {
    return {
      status: "safe-by-same-change",
      autoMergeable: true,
      reasons: ["Both patches contain the same semantic operations."],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  const dynamicEffects = new Set(["dynamic", "eval", "unsafeEval", "ffi", "reflection", "proxy"]);
  const hasDynamic = [...leftSummary.effects, ...rightSummary.effects].some((effect) =>
    dynamicEffects.has(effect)
  );
  if (hasDynamic) {
    return {
      status: "unknown-by-dynamic-effect",
      autoMergeable: false,
      reasons: ["At least one patch touches a dynamic or opaque effect boundary."],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (overlappingEffects.length > 0) {
    return {
      status: "conflict-by-effect-overlap",
      autoMergeable: false,
      reasons: [`Both patches touch effect(s): ${overlappingEffects.join(", ")}`],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (overlappingNodeIds.length > 0 || overlappingRegions.length > 0) {
    const laws = collectMergeLaws(base, [...overlappingNodeIds, ...overlappingRegions]);
    if (hasAutoMergeLawSet(laws)) {
      return withReplayGate(base, left, right, {
        status: "safe-by-merge-law",
        autoMergeable: true,
        reasons: [`Overlaps are covered by merge law(s): ${unique(laws).join(", ")}`],
        overlappingNodeIds,
        overlappingRegions,
        overlappingEffects,
        evidence
      });
    }

    return {
      status: "conflict-by-overlap",
      autoMergeable: false,
      reasons: ["Patches touch the same semantic node or region without a known merge law."],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  return withReplayGate(base, left, right, {
    status: "safe-by-disjoint-region",
    autoMergeable: true,
    reasons: ["Patches touch disjoint semantic nodes, regions, and effects."],
    overlappingNodeIds,
    overlappingRegions,
    overlappingEffects,
    evidence
  });
}

function validatePatchAgainstBase(base, patch, label, reasons) {
  try {
    applySemanticPatch(base, patch);
  } catch (error) {
    reasons.push(`${label} patch cannot be applied to base: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function requireNode(nodes, id) {
  const node = nodes[id];
  if (!node) {
    throw new Error(`Unknown semantic node id: ${id}`);
  }
  return node;
}

function withReplayGate(base, left, right, admission) {
  if (!admission.autoMergeable) {
    return admission;
  }

  try {
    const leftForReplay = stripPatchAdmissionHashes(left);
    const rightForReplay = stripPatchAdmissionHashes(right);
    const leftThenRight = applySemanticPatch(applySemanticPatch(base, leftForReplay), rightForReplay);
    const rightThenLeft = applySemanticPatch(applySemanticPatch(base, rightForReplay), leftForReplay);
    const leftHash = hashDocumentBase(leftThenRight);
    const rightHash = hashDocumentBase(rightThenLeft);
    if (leftHash !== rightHash) {
      return {
        ...admission,
        status: "unknown-needs-review",
        autoMergeable: false,
        reasons: [
          ...admission.reasons,
          `Replay order is not commutative: left-right ${leftHash}, right-left ${rightHash}`
        ]
      };
    }
    return admission;
  } catch (error) {
    return {
      ...admission,
      status: "unknown-needs-review",
      autoMergeable: false,
      reasons: [...admission.reasons, `Replay gate failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

function stripPatchAdmissionHashes(patch) {
  const { baseHash: _baseHash, targetHash: _targetHash, ...rest } = patch;
  return rest;
}

function collectMergeLaws(document, overlaps) {
  const overlapSet = new Set(overlaps);
  const laws = [];

  for (const node of Object.values(document.nodes)) {
    if (node.kind === "lattice" && (overlapSet.has(node.id) || overlapSet.has(node.name))) {
      laws.push(...(node.laws ?? []));
    }

    if (node.kind === "entity") {
      for (const field of node.fields) {
        if (overlapSet.has(field.id) || overlapSet.has(`${node.name}.${field.name}`)) {
          if (field.merge?.law) {
            laws.push(field.merge.law);
          }
          laws.push(...(field.merge?.laws ?? []));
          laws.push(...collectReferencedLatticeLaws(document, field.merge?.latticeId));
          laws.push(...collectReferencedLatticeLaws(document, field.semantic?.latticeId));
        }
      }
    }
    if (node.kind === "state") {
      for (const collection of node.collections) {
        if (overlapSet.has(collection.id) || overlapSet.has(`${node.name}.${collection.name}`)) {
          if (collection.merge?.law) {
            laws.push(collection.merge.law);
          }
          laws.push(...(collection.merge?.laws ?? []));
          laws.push(...collectReferencedLatticeLaws(document, collection.merge?.latticeId));
          laws.push(...collectReferencedLatticeLaws(document, collection.semantic?.latticeId));
        }
      }
    }
  }

  return laws;
}
