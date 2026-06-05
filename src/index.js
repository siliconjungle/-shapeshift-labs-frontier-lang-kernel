export function moduleNode(input) {
  return { ...input, kind: "module" };
}

export function entityNode(input) {
  return { ...input, kind: "entity" };
}

export function stateNode(input) {
  return { ...input, kind: "state" };
}

export function actionNode(input) {
  return { ...input, kind: "action" };
}

export function viewNode(input) {
  return { ...input, kind: "view" };
}

export function migrationNode(input) {
  return { ...input, kind: "migration" };
}

export function effectNode(input) {
  return { ...input, kind: "effect" };
}

export function capabilityNode(input) {
  return { ...input, kind: "capability" };
}

export function targetNode(input) {
  return { ...input, kind: "target" };
}

export function typeNode(input) {
  return { ...input, kind: "type" };
}

export function externNode(input) {
  return { ...input, kind: "extern" };
}

export function latticeNode(input) {
  return { ...input, kind: "lattice" };
}

export function nativeSourceNode(input) {
  return { ...input, kind: "nativeSource" };
}

export function createNativeAstRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.nativeAst",
    version: 1
  };
}

export function createImportResult(input) {
  return {
    ...input,
    kind: "frontier.lang.importResult",
    version: 1
  };
}

export function createPatch(input) {
  return {
    ...input,
    kind: "frontier.lang.patch",
    version: 1
  };
}

export function createDocument(input) {
  const nodes = {};
  for (const node of input.nodes) {
    if (nodes[node.id]) {
      throw new Error(`Duplicate semantic node id: ${node.id}`);
    }
    nodes[node.id] = node;
  }

  return {
    kind: "frontier.lang.document",
    version: 1,
    id: input.id,
    name: input.name,
    rootIds: input.rootIds ?? input.nodes.filter((node) => !node.parentId).map((node) => node.id),
    nodes,
    history: input.history,
    metadata: input.metadata
  };
}

export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => ordinalCompare(left, right));

  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

export function hashSemanticValue(value) {
  const serialized = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function hashDocumentBase(document) {
  return hashSemanticValue(stripHistory(document));
}

export function validateDocument(document) {
  const issues = [];
  const rootSet = new Set();
  const nodeIds = new Set(Object.keys(document.nodes));
  const nodeNames = new Map();

  for (const rootId of document.rootIds) {
    if (rootSet.has(rootId)) {
      issues.push(`Duplicate root node: ${rootId}`);
    }
    rootSet.add(rootId);
    if (!document.nodes[rootId]) {
      issues.push(`Missing root node: ${rootId}`);
    }
  }

  for (const [nodeId, node] of Object.entries(document.nodes)) {
    const namedNodes = nodeNames.get(node.name) ?? [];
    namedNodes.push(node);
    nodeNames.set(node.name, namedNodes);

    if (node.id !== nodeId) {
      issues.push(`Node record key ${nodeId} does not match node id ${node.id}`);
    }

    if (node.parentId && !document.nodes[node.parentId]) {
      issues.push(`Node ${node.id} references missing parent ${node.parentId}`);
    }

    if (node.parentId === node.id) {
      issues.push(`Node ${node.id} cannot be its own parent`);
    }

    if (!node.parentId && !rootSet.has(node.id)) {
      issues.push(`Parentless node ${node.id} is missing from rootIds`);
    }

    if (node.parentId && rootSet.has(node.id)) {
      issues.push(`Node ${node.id} has a parent and cannot be a root`);
    }

    if (hasAncestorCycle(document.nodes, node.id)) {
      issues.push(`Node ${node.id} is part of a parent cycle`);
    }

    if (node.kind === "entity") {
      const fieldIds = new Set();
      const fieldNames = new Set();
      for (const field of node.fields) {
        if (fieldIds.has(field.id)) {
          issues.push(`Entity ${node.id} has duplicate field id ${field.id}`);
        }
        fieldIds.add(field.id);
        if (fieldNames.has(field.name)) {
          issues.push(`Entity ${node.id} has duplicate field name ${field.name}`);
        }
        fieldNames.add(field.name);
        validateLatticeReference(document, nodeIds, nodeNames, field.merge?.latticeId, `Entity ${node.id} field ${field.name}`, issues);
        validateLatticeReference(document, nodeIds, nodeNames, field.semantic?.latticeId, `Entity ${node.id} field ${field.name}`, issues);
      }
    }

    if (node.kind === "state") {
      const collectionIds = new Set();
      const collectionNames = new Set();
      for (const collection of node.collections) {
        if (collectionIds.has(collection.id)) {
          issues.push(`State ${node.id} has duplicate collection id ${collection.id}`);
        }
        collectionIds.add(collection.id);
        if (collectionNames.has(collection.name)) {
          issues.push(`State ${node.id} has duplicate collection name ${collection.name}`);
        }
        collectionNames.add(collection.name);
        validateLatticeReference(document, nodeIds, nodeNames, collection.merge?.latticeId, `State ${node.id} collection ${collection.name}`, issues);
        validateLatticeReference(document, nodeIds, nodeNames, collection.semantic?.latticeId, `State ${node.id} collection ${collection.name}`, issues);
      }
    }

    if (node.kind === "type") {
      for (const duplicate of duplicateValues(node.parameters ?? [])) {
        issues.push(`Type ${node.id} has duplicate parameter ${duplicate}`);
      }
      for (const duplicate of duplicateValues((node.fields ?? []).map((field) => field.id))) {
        issues.push(`Type ${node.id} has duplicate field id ${duplicate}`);
      }
      for (const duplicate of duplicateValues((node.fields ?? []).map((field) => field.name))) {
        issues.push(`Type ${node.id} has duplicate field name ${duplicate}`);
      }
      for (const duplicate of duplicateValues((node.variants ?? []).map((variant) => variant.name))) {
        issues.push(`Type ${node.id} has duplicate variant ${duplicate}`);
      }
    }

    if (node.kind === "extern") {
      if (!node.language) {
        issues.push(`Extern ${node.id} is missing language`);
      }
      if (!node.symbol) {
        issues.push(`Extern ${node.id} is missing symbol`);
      }
    }

    if (node.kind === "capability") {
      if (!node.capability) {
        issues.push(`Capability ${node.id} is missing capability`);
      }
      const adapterKeys = new Set();
      for (const adapter of node.adapters ?? []) {
        if (!adapter.target?.language) {
          issues.push(`Capability ${node.id} has adapter without target language`);
        }
        if (!adapter.symbol) {
          issues.push(`Capability ${node.id} has adapter without symbol`);
        }
        const key = `${adapter.target?.language ?? ""}:${adapter.target?.platform ?? ""}:${adapter.symbol ?? ""}`;
        if (adapterKeys.has(key)) {
          issues.push(`Capability ${node.id} has duplicate adapter ${key}`);
        }
        adapterKeys.add(key);
      }
    }

    if (node.kind === "lattice") {
      if (!Array.isArray(node.laws) || node.laws.length === 0) {
        issues.push(`Lattice ${node.id} must declare at least one law`);
      }
      for (const duplicate of duplicateValues(node.laws ?? [])) {
        issues.push(`Lattice ${node.id} has duplicate law ${duplicate}`);
      }
    }

    if (node.kind === "nativeSource") {
      if (!node.language) {
        issues.push(`Native source ${node.id} is missing language`);
      }
      if (node.ast && node.ast.kind !== "frontier.lang.nativeAst") {
        issues.push(`Native source ${node.id} has invalid native AST record`);
      }
      for (const mappedId of node.frontierNodeIds ?? []) {
        if (!nodeIds.has(mappedId)) {
          issues.push(`Native source ${node.id} maps to missing semantic node ${mappedId}`);
        }
      }
    }
  }

  return issues;
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

function stripHistory(document) {
  const { history: _history, ...rest } = document;
  return rest;
}

function requireNode(nodes, id) {
  const node = nodes[id];
  if (!node) {
    throw new Error(`Unknown semantic node id: ${id}`);
  }
  return node;
}

function hasAncestorCycle(nodes, startId) {
  const seen = new Set();
  let current = nodes[startId];
  while (current?.parentId) {
    if (seen.has(current.parentId)) {
      return true;
    }
    seen.add(current.parentId);
    current = nodes[current.parentId];
  }
  return false;
}

function summarizePatch(patch) {
  const nodeIds = [];
  const regions = [];
  const effects = [];

  for (const operation of patch.operations) {
    if ("id" in operation && typeof operation.id === "string") {
      nodeIds.push(operation.id);
    }
    if (operation.op === "upsertNode") {
      nodeIds.push(operation.node.id);
      for (const region of operation.node.regions ?? []) {
        regions.push(region.id);
      }
      if (operation.node.kind === "action") {
        effects.push(...(operation.node.uses ?? []));
      }
      if (operation.node.kind === "effect") {
        effects.push(operation.node.capability);
      }
    }
    if (operation.op === "updateNode") {
      if (Array.isArray(operation.set.uses)) {
        effects.push(...operation.set.uses.filter((value) => typeof value === "string"));
      }
      if (typeof operation.set.capability === "string") {
        effects.push(operation.set.capability);
      }
      if (Array.isArray(operation.set.regions)) {
        for (const region of operation.set.regions) {
          if (region && typeof region === "object" && region.access === "effect" && typeof region.id === "string") {
            effects.push(region.id);
          }
        }
      }
    }

    for (const region of operation.touches ?? []) {
      regions.push(region.id);
      if (region.access === "effect") {
        effects.push(region.id);
      }
    }
  }

  return {
    nodeIds: unique(nodeIds),
    regions: unique(regions),
    effects: unique(effects)
  };
}

function collectPatchEvidence(patch) {
  const evidence = [...(patch.evidence ?? [])];
  for (const operation of patch.operations) {
    if (operation.op === "addEvidence") {
      evidence.push(operation.evidence);
    }
  }
  return evidence;
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

function validateLatticeReference(document, nodeIds, nodeNames, latticeId, context, issues) {
  if (!latticeId) {
    return;
  }
  if (nodeIds.has(latticeId)) {
    const node = document.nodes[latticeId];
    if (node?.kind !== "lattice") {
      issues.push(`${context} references non-lattice node ${latticeId}`);
    }
    return;
  }
  const matches = nodeNames.get(latticeId) ?? [];
  if (matches.some((node) => node.kind === "lattice")) {
    return;
  }
  issues.push(`${context} references missing lattice ${latticeId}`);
}

function collectReferencedLatticeLaws(document, latticeId) {
  if (!latticeId) {
    return [];
  }
  const direct = document.nodes[latticeId];
  if (direct?.kind === "lattice") {
    return direct.laws ?? [];
  }
  const byName = Object.values(document.nodes).find((node) => node.kind === "lattice" && node.name === latticeId);
  return byName?.laws ?? [];
}

function hasAutoMergeLawSet(laws) {
  if (laws.length === 0) {
    return false;
  }
  const allowed = new Set(["semilattice", "commutative", "associative", "idempotent"]);
  if (!laws.every((law) => allowed.has(law))) {
    return false;
  }
  return laws.includes("semilattice") || laws.includes("commutative");
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    if (seen.has(value) && !duplicates.includes(value)) {
      duplicates.push(value);
    }
    seen.add(value);
  }
  return duplicates;
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return unique(left.filter((item) => rightSet.has(item)));
}

function unique(items) {
  return [...new Set(items)];
}

function ordinalCompare(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
