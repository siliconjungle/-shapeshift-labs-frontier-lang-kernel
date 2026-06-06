import { collectLinkedSourcePreservationEvidence, uniqueEvidence } from "./evidence.js";
import { collectLinkedSourcePreservationLosses, collectNativeAstNodeIds, collectNativeSourceIds, explainSourcePreservationReasons, inferSourcePreservationLevel, validateSourceMapMappingPrecision } from "./source-map-helpers.js";
import { unique, uniqueById, validateSourceSpan } from "./shared.js";

export function createSourceMapRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.sourceMap",
    version: 1,
    mappings: input.mappings ?? [],
    evidence: input.evidence ?? []
  };
}

export function createSourcePreservationRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.sourcePreservation",
    version: 1,
    lossIds: input.lossIds ?? input.losses?.map((record) => record.id) ?? [],
    evidenceIds: input.evidenceIds ?? input.evidence?.map((record) => record.id) ?? [],
    reasons: input.reasons ?? []
  };
}

export function explainSourcePreservation(input) {
  const sourceMap = input.sourceMap;
  const mapping = input.mapping ?? sourceMap?.mappings?.find((record) => record.id === input.mappingId);
  const sourceMapId = input.sourceMapId ?? sourceMap?.id ?? mapping?.sourceMapId;
  const mappingId = input.sourceMapMappingId ?? mapping?.id ?? input.mappingId;
  const linkedLosses = collectLinkedSourcePreservationLosses(input.losses ?? [], {
    sourceMapId,
    mappingId,
    lossIds: mapping?.lossIds ?? input.lossIds
  });
  const linkedEvidence = collectLinkedSourcePreservationEvidence(uniqueEvidence([
    ...(input.evidence ?? []),
    ...(sourceMap?.evidence ?? [])
  ]), {
    evidenceIds: unique([
      ...(mapping?.evidenceIds ?? []),
      ...(input.evidenceIds ?? []),
      ...linkedLosses.flatMap((record) => record.evidenceIds ?? [])
    ])
  });
  const level = input.level ?? mapping?.preservation ?? inferSourcePreservationLevel(mapping, linkedLosses);
  const reasons = input.reasons ?? explainSourcePreservationReasons({
    level,
    mapping,
    losses: linkedLosses,
    evidence: linkedEvidence
  });

  return createSourcePreservationRecord({
    id: input.id ?? `source-preservation:${sourceMapId ?? "unmapped"}:${mappingId ?? "unmapped"}`,
    level,
    precision: input.precision ?? mapping?.precision,
    sourceMapId,
    sourceMapMappingId: mappingId,
    semanticNodeId: input.semanticNodeId ?? mapping?.semanticNodeId,
    nativeSourceId: input.nativeSourceId ?? mapping?.nativeSourceId,
    nativeAstNodeId: input.nativeAstNodeId ?? mapping?.nativeAstNodeId,
    semanticSymbolId: input.semanticSymbolId ?? mapping?.semanticSymbolId,
    semanticOccurrenceId: input.semanticOccurrenceId ?? mapping?.semanticOccurrenceId,
    sourceSpan: input.sourceSpan ?? mapping?.sourceSpan,
    generatedSpan: input.generatedSpan ?? mapping?.generatedSpan,
    losses: linkedLosses,
    evidence: linkedEvidence,
    reasons,
    metadata: input.metadata
  });
}

export function validateSourceMapRecord(sourceMap, context = {}) {
  const issues = [];
  if (sourceMap.kind !== "frontier.lang.sourceMap") {
    issues.push(`Source map ${sourceMap.id ?? "(unknown)"} has invalid kind`);
  }
  if (sourceMap.version !== 1) {
    issues.push(`Source map ${sourceMap.id ?? "(unknown)"} has unsupported version ${sourceMap.version}`);
  }
  if (!sourceMap.id) {
    issues.push("Source map is missing id");
  }

  const documentNodeIds = new Set(Object.keys(context.document?.nodes ?? {}));
  const nativeSourceIds = collectNativeSourceIds(context.document, context.nativeSources);
  const nativeAstNodeIds = collectNativeAstNodeIds(context.nativeAst, context.nativeSources);
  const symbolIds = new Set((context.semanticIndex?.symbols ?? []).map((symbol) => symbol.id));
  const occurrenceIds = new Set((context.semanticIndex?.occurrences ?? []).map((occurrence) => occurrence.id));
  const mergeCandidateIds = new Set((context.mergeCandidates ?? []).map((candidate) => candidate.id));
  const losses = uniqueById([
    ...(context.losses ?? []),
    ...(context.nativeAst?.losses ?? []),
    ...(context.nativeSources ?? []).flatMap((source) => source.losses ?? source.ast?.losses ?? [])
  ]);
  const evidenceIds = new Set([
    ...(context.evidence ?? []).map((record) => record.id),
    ...(sourceMap.evidence ?? []).map((record) => record.id),
    ...(context.semanticIndex?.evidence ?? []).map((record) => record.id),
    ...(context.mergeCandidates ?? []).flatMap((candidate) => (candidate.evidence ?? []).map((record) => record.id))
  ]);
  const lossIds = new Set(losses.map((record) => record.id));
  const sourceMaps = uniqueById([sourceMap, ...(context.sourceMaps ?? [])]);
  const sourceMapIds = new Set(sourceMaps.map((record) => record.id));
  const mappingIdsBySourceMap = new Map(sourceMaps.map((record) => [
    record.id,
    new Set((record.mappings ?? []).map((mapping) => mapping.id).filter(Boolean))
  ]));
  const mappingIds = new Set();

  if (sourceMap.nativeSourceId && nativeSourceIds.size > 0 && !nativeSourceIds.has(sourceMap.nativeSourceId)) {
    issues.push(`Source map ${sourceMap.id} references missing native source ${sourceMap.nativeSourceId}`);
  }
  if (sourceMap.nativeAstId && context.nativeAst && sourceMap.nativeAstId !== context.nativeAst.id) {
    issues.push(`Source map ${sourceMap.id} references native AST ${sourceMap.nativeAstId} but context contains ${context.nativeAst.id}`);
  }
  if (sourceMap.semanticIndexId && context.semanticIndex && sourceMap.semanticIndexId !== context.semanticIndex.id) {
    issues.push(`Source map ${sourceMap.id} references semantic index ${sourceMap.semanticIndexId} but context contains ${context.semanticIndex.id}`);
  }

  for (const mapping of sourceMap.mappings ?? []) {
    if (!mapping?.id) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} has mapping without id`);
      continue;
    }
    if (mappingIds.has(mapping.id)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} has duplicate mapping id ${mapping.id}`);
    }
    mappingIds.add(mapping.id);
    if (!mapping.precision) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} is missing precision`);
    }
    validateSourceMapMappingPrecision(mapping, sourceMap, `Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id}`, issues);
    if (mapping.semanticNodeId && documentNodeIds.size > 0 && !documentNodeIds.has(mapping.semanticNodeId)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing semantic node ${mapping.semanticNodeId}`);
    }
    if (mapping.nativeSourceId && nativeSourceIds.size > 0 && !nativeSourceIds.has(mapping.nativeSourceId)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing native source ${mapping.nativeSourceId}`);
    }
    if (mapping.nativeAstNodeId && nativeAstNodeIds.size > 0 && !nativeAstNodeIds.has(mapping.nativeAstNodeId)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing native AST node ${mapping.nativeAstNodeId}`);
    }
    if (mapping.semanticSymbolId && symbolIds.size > 0 && !symbolIds.has(mapping.semanticSymbolId)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing semantic symbol ${mapping.semanticSymbolId}`);
    }
    if (mapping.semanticOccurrenceId && occurrenceIds.size > 0 && !occurrenceIds.has(mapping.semanticOccurrenceId)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing semantic occurrence ${mapping.semanticOccurrenceId}`);
    }
    if (mapping.mergeCandidateId && mergeCandidateIds.size > 0 && !mergeCandidateIds.has(mapping.mergeCandidateId)) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing merge candidate ${mapping.mergeCandidateId}`);
    }
    for (const evidenceId of mapping.evidenceIds ?? []) {
      if (evidenceIds.size > 0 && !evidenceIds.has(evidenceId)) {
        issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing evidence ${evidenceId}`);
      }
    }
    for (const lossId of mapping.lossIds ?? []) {
      if (lossIds.size > 0 && !lossIds.has(lossId)) {
        issues.push(`Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} references missing loss ${lossId}`);
      }
    }
    validateSourceSpan(mapping.sourceSpan, `Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} source span`, issues);
    validateSourceSpan(mapping.generatedSpan, `Source map ${sourceMap.id ?? "(unknown)"} mapping ${mapping.id} generated span`, issues);
  }

  for (const loss of losses) {
    if (!loss?.id) {
      issues.push(`Source map ${sourceMap.id ?? "(unknown)"} context has loss without id`);
      continue;
    }
    if (loss.sourceMapId && sourceMapIds.size > 0 && !sourceMapIds.has(loss.sourceMapId)) {
      issues.push(`Loss ${loss.id} references missing source map ${loss.sourceMapId}`);
    }
    if (loss.sourceMapMappingId) {
      if (!loss.sourceMapId) {
        issues.push(`Loss ${loss.id} references source map mapping ${loss.sourceMapMappingId} without sourceMapId`);
      } else if (mappingIdsBySourceMap.has(loss.sourceMapId) && !mappingIdsBySourceMap.get(loss.sourceMapId).has(loss.sourceMapMappingId)) {
        issues.push(`Loss ${loss.id} references missing source map mapping ${loss.sourceMapMappingId}`);
      }
    }
    if (loss.semanticIndexId && context.semanticIndex && loss.semanticIndexId !== context.semanticIndex.id) {
      issues.push(`Loss ${loss.id} references semantic index ${loss.semanticIndexId} but context contains ${context.semanticIndex.id}`);
    }
    if (loss.semanticSymbolId && symbolIds.size > 0 && !symbolIds.has(loss.semanticSymbolId)) {
      issues.push(`Loss ${loss.id} references missing semantic symbol ${loss.semanticSymbolId}`);
    }
    if (loss.semanticOccurrenceId && occurrenceIds.size > 0 && !occurrenceIds.has(loss.semanticOccurrenceId)) {
      issues.push(`Loss ${loss.id} references missing semantic occurrence ${loss.semanticOccurrenceId}`);
    }
    if (loss.nodeId && nativeAstNodeIds.size > 0 && !nativeAstNodeIds.has(loss.nodeId)) {
      issues.push(`Loss ${loss.id} references missing native AST node ${loss.nodeId}`);
    }
    for (const evidenceId of loss.evidenceIds ?? []) {
      if (evidenceIds.size > 0 && !evidenceIds.has(evidenceId)) {
        issues.push(`Loss ${loss.id} references missing evidence ${evidenceId}`);
      }
    }
    validateSourceSpan(loss.span, `Loss ${loss.id} span`, issues);
  }

  return issues;
}
