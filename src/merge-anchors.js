import { hashSemanticValue } from "./hashing.js";
import { ordinalCompare, unique, uniqueById } from "./shared.js";

export function collectTouchedSemanticMergeSymbols(semanticIndex, semanticTouchIds, includeAll) {
  const symbols = [];
  const occurrencesBySymbol = groupOccurrencesBySymbol(semanticIndex?.occurrences ?? []);

  for (const symbol of semanticIndex?.symbols ?? []) {
    const occurrences = occurrencesBySymbol.get(symbol.id) ?? [];
    const isTouched = includeAll ||
      semanticTouchIds.has(symbol.id) ||
      semanticTouchIds.has(symbol.name) ||
      (symbol.semanticNodeId && semanticTouchIds.has(symbol.semanticNodeId)) ||
      (symbol.nativeAstNodeId && semanticTouchIds.has(symbol.nativeAstNodeId)) ||
      occurrences.some((occurrence) =>
        semanticTouchIds.has(occurrence.id) ||
        (occurrence.semanticNodeId && semanticTouchIds.has(occurrence.semanticNodeId)) ||
        (occurrence.nativeAstNodeId && semanticTouchIds.has(occurrence.nativeAstNodeId))
      );
    if (!isTouched) {
      continue;
    }

    const occurrence = occurrences.find((record) => record.role === "definition" || record.role === "declaration") ?? occurrences[0];
    symbols.push({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      role: occurrence?.role,
      semanticNodeId: symbol.semanticNodeId ?? occurrence?.semanticNodeId,
      nativeAstNodeId: symbol.nativeAstNodeId ?? occurrence?.nativeAstNodeId,
      span: symbol.definitionSpan ?? occurrence?.span,
      conflictKey: `symbol:${symbol.id}`,
      metadata: symbol.metadata
    });
  }

  return uniqueById(symbols);
}

export function collectTouchedSemanticMergeNodes(document, semanticIndex, touchedSymbols, semanticTouchIds, includeAll) {
  const ids = [];
  for (const id of semanticTouchIds) {
    if (document?.nodes?.[id]) {
      ids.push(id);
    }
  }
  for (const symbol of touchedSymbols) {
    if (symbol.semanticNodeId) {
      ids.push(symbol.semanticNodeId);
    }
  }
  for (const occurrence of semanticIndex?.occurrences ?? []) {
    if (occurrence.semanticNodeId && (includeAll || semanticTouchIds.has(occurrence.semanticNodeId))) {
      ids.push(occurrence.semanticNodeId);
    }
  }
  if (includeAll) {
    for (const node of Object.values(document?.nodes ?? {})) {
      if (node.kind === "nativeSource") {
        ids.push(...(node.frontierNodeIds ?? []));
      }
    }
  }

  return unique(ids)
    .filter((id) => document?.nodes?.[id])
    .map((id) => {
      const node = document.nodes[id];
      return {
        id,
        kind: node.kind,
        name: node.name,
        conflictKey: `node:${id}`,
        metadata: node.metadata
      };
    });
}

export function collectSemanticMergeNativeSpans(input) {
  const spans = [];
  const touchedSymbolIds = new Set(input.touchedSymbols.map((symbol) => symbol.id));
  const touchedNativeNodeIds = new Set(input.touchedSymbols.map((symbol) => symbol.nativeAstNodeId).filter(Boolean));
  const documentsById = new Map((input.semanticIndex?.documents ?? []).map((document) => [document.id, document]));

  for (const occurrence of input.semanticIndex?.occurrences ?? []) {
    const document = documentsById.get(occurrence.documentId);
    const isTouched = input.includeAll ||
      touchedSymbolIds.has(occurrence.symbolId) ||
      (occurrence.semanticNodeId && input.semanticTouchIds.has(occurrence.semanticNodeId)) ||
      (occurrence.nativeAstNodeId && touchedNativeNodeIds.has(occurrence.nativeAstNodeId));
    if (!occurrence.span || !isTouched) {
      continue;
    }
    if (occurrence.nativeAstNodeId) {
      touchedNativeNodeIds.add(occurrence.nativeAstNodeId);
    }
    const span = spanWithFallbackPath(occurrence.span, document?.path ?? input.sourcePath);
    spans.push({
      id: `span:${occurrence.id}`,
      sourceId: span.sourceId,
      path: span.path,
      language: document?.language ?? input.language,
      nativeAstNodeId: occurrence.nativeAstNodeId,
      semanticNodeId: occurrence.semanticNodeId,
      symbolId: occurrence.symbolId,
      span,
      conflictKey: nativeSpanConflictKey(span, occurrence.nativeAstNodeId)
    });
  }

  for (const [nodeId, node] of Object.entries(input.nativeAst?.nodes ?? {})) {
    if (!node.span) {
      continue;
    }
    if (!input.includeAll && !touchedNativeNodeIds.has(nodeId) && !input.semanticTouchIds.has(nodeId)) {
      continue;
    }
    const span = spanWithFallbackPath(node.span, input.sourcePath ?? input.nativeAst?.sourcePath);
    spans.push({
      id: `span:${nodeId}`,
      sourceId: span.sourceId,
      path: span.path,
      language: input.language ?? input.nativeAst?.language,
      nativeAstNodeId: nodeId,
      span,
      conflictKey: nativeSpanConflictKey(span, nodeId),
      metadata: node.metadata
    });
  }

  return uniqueById(spans);
}

export function spanWithFallbackPath(span, path) {
  return {
    ...span,
    path: span.path ?? path
  };
}

export function nativeSpanConflictKey(span, nativeAstNodeId) {
  const location = [
    span.path ?? span.sourceId ?? "unknown",
    span.startLine ?? span.start ?? "",
    span.startColumn ?? "",
    span.endLine ?? span.end ?? "",
    span.endColumn ?? "",
    nativeAstNodeId ?? ""
  ].join(":");
  return `native:${location}`;
}

export function collectSemanticMergeConflictKeys(input) {
  return unique([
    ...(input.touchedSymbols ?? []).map((symbol) => symbol.conflictKey ?? `symbol:${symbol.id}`),
    ...(input.touchedSemanticNodes ?? []).map((node) => node.conflictKey ?? `node:${node.id}`),
    ...(input.nativeSpans ?? []).map((span) => span.conflictKey),
    ...(input.regions ?? []).map((region) => `region:${region}`),
    ...(input.effects ?? []).map((effect) => `effect:${effect}`),
    ...(input.extra ?? [])
  ].filter(Boolean)).sort(ordinalCompare);
}

export function collectSourceMapSemanticTouchIds(sourceMaps) {
  const ids = [];
  for (const sourceMap of sourceMaps ?? []) {
    for (const mapping of sourceMap.mappings ?? []) {
      if (mapping.semanticNodeId) ids.push(mapping.semanticNodeId);
      if (mapping.semanticSymbolId) ids.push(mapping.semanticSymbolId);
      if (mapping.semanticOccurrenceId) ids.push(mapping.semanticOccurrenceId);
      if (mapping.nativeAstNodeId) ids.push(mapping.nativeAstNodeId);
    }
  }
  return new Set(unique(ids));
}

export function collectSourceMapNativeSpans(sourceMaps, input) {
  const spans = [];
  for (const sourceMap of sourceMaps ?? []) {
    for (const mapping of sourceMap.mappings ?? []) {
      const span = mapping.sourceSpan ?? mapping.generatedSpan;
      if (!span) continue;
      const normalizedSpan = spanWithFallbackPath(span, sourceMap.sourcePath ?? input.sourcePath);
      spans.push({
        id: `sourcemap:${sourceMap.id}:${mapping.id}`,
        sourceId: normalizedSpan.sourceId,
        path: normalizedSpan.path,
        language: input.language,
        nativeAstNodeId: mapping.nativeAstNodeId,
        semanticNodeId: mapping.semanticNodeId,
        symbolId: mapping.semanticSymbolId,
        span: normalizedSpan,
        conflictKey: nativeSpanConflictKey(normalizedSpan, mapping.nativeAstNodeId ?? mapping.id),
        metadata: {
          sourceMapId: sourceMap.id,
          mappingId: mapping.id,
          precision: mapping.precision,
          generatedSpan: mapping.generatedSpan,
          mergeCandidateId: mapping.mergeCandidateId
        }
      });
    }
  }
  return uniqueById(spans);
}

export function collectNativeAstSubtreeConflictKeys(nativeAst, options = {}) {
  if (!nativeAst?.nodes) {
    return { conflictKeys: [], duplicateHashes: [], truncated: false };
  }
  const hashesByNodeId = new Map();
  const counts = new Map();
  for (const nodeId of Object.keys(nativeAst.nodes).sort(ordinalCompare)) {
    const hash = nativeAstSubtreeHash(nativeAst, nodeId, hashesByNodeId, new Set());
    counts.set(hash, (counts.get(hash) ?? 0) + 1);
  }
  const conflictKeys = [];
  const duplicateHashes = [];
  const path = options.sourcePath ?? nativeAst.sourcePath ?? "unknown";
  for (const [nodeId, hash] of [...hashesByNodeId.entries()].sort(([left], [right]) => ordinalCompare(left, right))) {
    if ((counts.get(hash) ?? 0) > 1) {
      duplicateHashes.push(hash);
      continue;
    }
    conflictKeys.push(`ast-subtree:${path}:${hash}:${nodeId}`);
    if (conflictKeys.length >= options.maxKeys) {
      return { conflictKeys, duplicateHashes: unique(duplicateHashes).sort(ordinalCompare), truncated: true };
    }
  }
  return { conflictKeys, duplicateHashes: unique(duplicateHashes).sort(ordinalCompare), truncated: false };
}

export function nativeAstSubtreeHash(nativeAst, nodeId, cache, seen) {
  if (cache.has(nodeId)) {
    return cache.get(nodeId);
  }
  if (seen.has(nodeId)) {
    return hashSemanticValue({ cycle: nodeId });
  }
  seen.add(nodeId);
  const node = nativeAst.nodes[nodeId] ?? {};
  const children = (node.children ?? []).map((childId) => nativeAstSubtreeHash(nativeAst, childId, cache, seen));
  seen.delete(nodeId);
  const hash = hashSemanticValue({
    kind: node.kind,
    languageKind: node.languageKind,
    value: node.value,
    fields: node.fields,
    children
  });
  cache.set(nodeId, hash);
  return hash;
}

export function collectSemanticSignatureConflictKeys(semanticIndex, language) {
  const signatureFactsBySubject = new Map();
  for (const fact of semanticIndex?.facts ?? []) {
    if (fact.predicate === "signatureHash" && typeof fact.value === "string") {
      signatureFactsBySubject.set(fact.subjectId, fact.value);
    }
  }
  const keys = [];
  for (const symbol of semanticIndex?.symbols ?? []) {
    const signatureHash = symbol.signatureHash ?? signatureFactsBySubject.get(symbol.id);
    if (!signatureHash) continue;
    keys.push(`sig:${symbol.language ?? language ?? "unknown"}:${symbol.id}:${signatureHash}`);
  }
  return unique(keys).sort(ordinalCompare);
}

export function groupOccurrencesBySymbol(occurrences) {
  const groups = new Map();
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.symbolId) ?? [];
    group.push(occurrence);
    groups.set(occurrence.symbolId, group);
  }
  return groups;
}
