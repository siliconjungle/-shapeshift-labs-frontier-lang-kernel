import { validateLatticeReference } from "./lattice.js";
import { duplicateValues } from "./shared.js";

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
