import { ordinalCompare } from "./shared.js";

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

export function hashUniversalAstEnvelope(envelope) {
  return hashSemanticValue(envelope);
}

export function stableUniversalAstJson(envelope) {
  return stableStringify(envelope);
}

function stripHistory(document) {
  const { history: _history, ...rest } = document;
  return rest;
}

export function hashDocumentBase(document) {
  return hashSemanticValue(stripHistory(document));
}
