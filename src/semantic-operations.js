import { unique } from "./shared.js";

export const SemanticOperationKinds = Object.freeze([
  "declaration",
  "expression",
  "controlFlow",
  "dataFlow",
  "effect",
  "type",
  "memory",
  "concurrency",
  "macro",
  "extern",
  "runtime",
  "projection",
  "merge",
  "proof",
  "sourcePreservation",
  "dialect",
  "opaque"
]);

export function createSemanticOperationRecord(input = {}, context = {}) {
  const id = input.id ?? semanticOperationId(input, context);
  const semanticNodeIds = uniqueStrings(input.semanticNodeIds, input.semanticNodeId);
  const semanticSymbolIds = uniqueStrings(input.semanticSymbolIds, input.semanticSymbolId);
  const nativeAstNodeIds = uniqueStrings(input.nativeAstNodeIds, input.nativeAstNodeId);
  const sourceMapIds = uniqueStrings(input.sourceMapIds, input.sourceMapId);
  const sourceMapMappingIds = uniqueStrings(input.sourceMapMappingIds, input.sourceMapMappingId);
  const effectIds = uniqueStrings(input.effectIds, input.effectId, ...(input.effects ?? []));
  const normalized = { ...input, id, semanticNodeIds, semanticSymbolIds, nativeAstNodeIds, sourceMapIds, sourceMapMappingIds, effectIds };
  const ownershipKeys = semanticOperationOwnershipKeys(normalized);
  const conflictKeys = semanticOperationConflictKeys({ ...normalized, ownershipKeys });
  return {
    kind: "frontier.lang.semanticOperation",
    version: 1,
    id,
    operationKind: input.operationKind ?? input.op ?? context.operationKind ?? "opaque",
    language: input.language ?? context.language,
    name: input.name,
    target: input.target ?? context.target,
    nativeSourceId: input.nativeSourceId ?? context.nativeSourceId,
    nativeAstId: input.nativeAstId ?? context.nativeAstId,
    nativeAstNodeIds,
    semanticNodeIds,
    semanticSymbolIds,
    semanticOccurrenceIds: uniqueStrings(input.semanticOccurrenceIds, input.semanticOccurrenceId),
    sourceSpan: input.sourceSpan,
    sourceMapIds,
    sourceMapMappingIds,
    proofObligationIds: uniqueStrings(input.proofObligationIds, input.proofObligationId),
    proofArtifactIds: uniqueStrings(input.proofArtifactIds, input.proofArtifactId),
    evidenceIds: uniqueStrings(input.evidenceIds, input.evidenceId),
    lossIds: uniqueStrings(input.lossIds, input.lossId),
    reads: uniqueStrings(input.reads),
    writes: uniqueStrings(input.writes),
    effectIds,
    resources: uniqueStrings(input.resources, input.resource),
    ownershipKeys,
    conflictKeys,
    readiness: input.readiness ?? "needs-review",
    dynamic: Boolean(input.dynamic),
    opaque: Boolean(input.opaque ?? input.operationKind === "opaque"),
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    payload: input.payload,
    metadata: {
      ...(input.metadata ?? {}),
      operationContract: "semantic-operation-records-describe-reviewable behavior and merge ownership; they are not executable target proof."
    }
  };
}

export function createSemanticOperationSet(input = {}, context = {}) {
  const operations = (input.operations ?? input.records ?? []).map((operation, index) =>
    createSemanticOperationRecord(operation, { ...context, index })
  );
  return {
    kind: "frontier.lang.semanticOperationSet",
    version: 1,
    id: input.id ?? `semanticOperations:${context.id ?? "set"}`,
    operations,
    summary: summarizeSemanticOperations(operations),
    metadata: input.metadata ?? {}
  };
}

export function summarizeSemanticOperations(operations = []) {
  return {
    operations: operations.length,
    byOperationKind: countBy(operations.map((operation) => operation.operationKind)),
    languages: uniqueStrings(operations.map((operation) => operation.language).filter(Boolean)),
    semanticNodeIds: uniqueStrings(operations.flatMap((operation) => operation.semanticNodeIds)),
    nativeAstNodeIds: uniqueStrings(operations.flatMap((operation) => operation.nativeAstNodeIds)),
    effectIds: uniqueStrings(operations.flatMap((operation) => operation.effectIds)),
    ownershipKeys: uniqueStrings(operations.flatMap((operation) => operation.ownershipKeys)),
    conflictKeys: uniqueStrings(operations.flatMap((operation) => operation.conflictKeys)),
    evidenceIds: uniqueStrings(operations.flatMap((operation) => operation.evidenceIds)),
    lossIds: uniqueStrings(operations.flatMap((operation) => operation.lossIds)),
    proofObligationIds: uniqueStrings(operations.flatMap((operation) => operation.proofObligationIds)),
    dynamicOperations: operations.filter((operation) => operation.dynamic).length,
    opaqueOperations: operations.filter((operation) => operation.opaque).length,
    autoMergeClaims: operations.filter((operation) => operation.autoMergeClaim).length,
    semanticEquivalenceClaims: operations.filter((operation) => operation.semanticEquivalenceClaim).length
  };
}

export function semanticOperationOwnershipKeys(operation = {}) {
  return uniqueStrings(
    operation.ownershipKeys,
    operation.ownerKey,
    ...(operation.semanticNodeIds?.map((id) => `node:${id}`) ?? []),
    ...(operation.semanticSymbolIds?.map((id) => `symbol:${id}`) ?? []),
    ...(operation.nativeAstNodeIds?.map((id) => `native-node:${id}`) ?? []),
    ...(operation.effectIds?.map((id) => `effect:${id}`) ?? [])
  );
}

export function semanticOperationConflictKeys(operation = {}) {
  return uniqueStrings(
    operation.conflictKeys,
    ...semanticOperationOwnershipKeys(operation),
    ...(operation.sourceMapMappingIds?.map((id) => `source-map:${id}`) ?? []),
    ...(operation.resources?.map((id) => `resource:${id}`) ?? []),
    ...(operation.dynamic ? ["effect:dynamic"] : []),
    ...(operation.opaque ? [`opaque:${operation.id ?? operation.operationKind ?? "operation"}`] : [])
  );
}

export function semanticOperationToMergeCandidate(operation, input = {}) {
  return {
    kind: "frontier.lang.semanticMergeCandidate",
    version: 1,
    id: input.id ?? `merge-candidate:${operation.id}`,
    language: operation.language,
    sourcePath: input.sourcePath,
    touchedSymbols: operation.semanticSymbolIds.map((id) => ({ id, conflictKey: `symbol:${id}` })),
    touchedSemanticNodes: operation.semanticNodeIds.map((id) => ({ id, conflictKey: `node:${id}` })),
    nativeSpans: [],
    conflictKeys: operation.conflictKeys,
    readiness: operation.readiness,
    reasons: [
      ...(input.reasons ?? []),
      ...(operation.dynamic ? ["Semantic operation is dynamic."] : []),
      ...(operation.opaque ? ["Semantic operation is opaque."] : [])
    ],
    metadata: {
      semanticOperationId: operation.id,
      operationKind: operation.operationKind,
      ownershipKeys: operation.ownershipKeys
    }
  };
}

function semanticOperationId(input, context) {
  const label = [input.operationKind ?? input.op ?? "operation", input.name, input.semanticNodeId, input.nativeAstNodeId, context.index]
    .filter((part) => part !== undefined && part !== "")
    .join(":");
  return `semanticOperation:${label || "unknown"}`;
}

function uniqueStrings(...values) {
  return unique(values.flat().filter((value) => typeof value === "string" && value.length > 0));
}

function countBy(values) {
  const counts = {};
  for (const value of values.filter(Boolean)) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}
