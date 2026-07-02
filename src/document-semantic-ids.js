export function collectDocumentSemanticIds(document) {
  const ids = new Set();
  const seen = new Set();
  for (const node of Object.values(document?.nodes ?? {})) {
    collectRecordIds(node, ids, seen);
  }
  return ids;
}

function collectRecordIds(value, ids, seen) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  if (typeof value.id === "string" && value.id) ids.add(value.id);
  if (Array.isArray(value)) {
    for (const item of value) collectRecordIds(item, ids, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "ast" || key === "metadata") continue;
    collectRecordIds(child, ids, seen);
  }
}
