export function collectUniversalAstLayerRecords(layers) {
  if (!layers) {
    return [];
  }
  if (Array.isArray(layers)) {
    return layers;
  }
  if (typeof layers !== "object") {
    return [];
  }
  return Object.values(layers).flatMap((value) => Array.isArray(value) ? value : [value]);
}
