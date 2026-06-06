

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
