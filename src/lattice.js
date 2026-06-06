

export function validateLatticeReference(document, nodeIds, nodeNames, latticeId, context, issues) {
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

export function collectReferencedLatticeLaws(document, latticeId) {
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

export function hasAutoMergeLawSet(laws) {
  if (laws.length === 0) {
    return false;
  }
  const allowed = new Set(["semilattice", "commutative", "associative", "idempotent"]);
  if (!laws.every((law) => allowed.has(law))) {
    return false;
  }
  return laws.includes("semilattice") || laws.includes("commutative");
}
