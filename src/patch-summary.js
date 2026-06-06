import { unique } from "./shared.js";

export function summarizePatch(patch) {
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

export function emptyPatchSummary() {
  return { nodeIds: [], regions: [], effects: [] };
}

export function collectPatchSemanticTouchIds(document, patchSummary) {
  const ownerByRegion = collectSemanticRegionOwners(document);
  const ids = [...patchSummary.nodeIds];
  for (const region of patchSummary.regions) {
    const ownerId = ownerByRegion.get(region);
    if (ownerId) {
      ids.push(ownerId);
    }
  }
  return new Set(unique(ids));
}

export function collectSemanticRegionOwners(document) {
  const owners = new Map();
  for (const node of Object.values(document?.nodes ?? {})) {
    if (node.kind === "entity") {
      for (const field of node.fields ?? []) {
        owners.set(field.id, node.id);
        owners.set(`${node.name}.${field.name}`, node.id);
      }
    }
    if (node.kind === "state") {
      for (const collection of node.collections ?? []) {
        owners.set(collection.id, node.id);
        owners.set(`${node.name}.${collection.name}`, node.id);
      }
    }
  }
  return owners;
}
