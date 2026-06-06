export const NativeAstLossKinds = Object.freeze([
  "unsupportedSyntax",
  "unsupportedSemantic",
  "opaqueNative",
  "missingTypeInfo",
  "macroExpansion",
  "preprocessor",
  "dynamicRuntime",
  "unresolvedSymbol",
  "nonRoundTrippable",
  "declarationOnlyCoverage",
  "partialSemanticIndex",
  "sourceMapApproximation",
  "sourcePreservation",
  "conditionalCompilation",
  "reflection",
  "macroHygiene",
  "unsafeFfi",
  "dynamicDispatch",
  "generatedCode",
  "targetLowering"
]);

export const SourceMapPrecisions = Object.freeze([
  "exact",
  "declaration",
  "line",
  "estimated",
  "unknown"
]);

export const SourcePreservationLevels = Object.freeze([
  "exact",
  "declaration",
  "estimated",
  "blocked"
]);

export const UniversalAstLayerNames = Object.freeze([
  "losslessSource",
  "cst",
  "semanticSymbols",
  "effects",
  "controlFlow",
  "dataFlow",
  "proofSpec",
  "paradigmSemantics",
  "runtimeModel",
  "projectionEvidence",
  "mergeEvidence"
]);

export const UniversalAstReferenceKinds = Object.freeze([
  "layer",
  "nativeSource",
  "nativeAst",
  "nativeAstNode",
  "semanticNode",
  "semanticIndex",
  "semanticSymbol",
  "semanticOccurrence",
  "semanticRelation",
  "semanticFact",
  "sourceMap",
  "sourceMapMapping",
  "mergeCandidate",
  "proofContract",
  "proofObligation",
  "proofArtifact",
  "proofAssumption",
  "paradigmRecord",
  "loss",
  "evidence",
  "effect"
]);

export const ProofSpecContractKinds = Object.freeze([
  "precondition",
  "postcondition",
  "assertion",
  "frame",
  "refinement",
  "invariant",
  "termination",
  "temporal",
  "assumption"
]);

export const ProofObligationStatuses = Object.freeze([
  "open",
  "discharged",
  "failed",
  "unknown",
  "stale",
  "assumed"
]);

export const ProofArtifactKinds = Object.freeze([
  "solverRun",
  "proofScript",
  "modelCheck",
  "counterexample",
  "certificate",
  "manualReview",
  "testEvidence"
]);

export const ParadigmSemanticsRecordGroups = Object.freeze([
  "bindingScopes",
  "bindings",
  "patterns",
  "typeConstraints",
  "evaluationModels",
  "memoryLocations",
  "effectRegions",
  "controlRegions",
  "logicPrograms",
  "actorSystems",
  "stackEffects",
  "arrayShapes",
  "numericKernels",
  "dataflowNetworks",
  "clockModels",
  "objectModels",
  "macroExpansions",
  "reflectionBoundaries",
  "loweringRecords"
]);

const ParadigmSemanticsRecordPrefixes = Object.freeze({
  bindingScopes: "bindingScope",
  bindings: "binding",
  patterns: "pattern",
  typeConstraints: "typeConstraint",
  evaluationModels: "evaluationModel",
  memoryLocations: "memoryLocation",
  effectRegions: "effectRegion",
  controlRegions: "controlRegion",
  logicPrograms: "logicProgram",
  actorSystems: "actorSystem",
  stackEffects: "stackEffect",
  arrayShapes: "arrayShape",
  numericKernels: "numericKernel",
  dataflowNetworks: "dataflowNetwork",
  clockModels: "clockModel",
  objectModels: "objectModel",
  macroExpansions: "macroExpansion",
  reflectionBoundaries: "reflectionBoundary",
  loweringRecords: "loweringRecord"
});

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

export function createNativeAstRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.nativeAst",
    version: 1
  };
}

export function createSemanticIndexRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.semanticIndex",
    version: 1,
    documents: input.documents ?? [],
    symbols: input.symbols ?? [],
    occurrences: input.occurrences ?? [],
    relations: input.relations ?? [],
    facts: input.facts ?? []
  };
}

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

export function createUniversalAstLayer(input) {
  return {
    ...input,
    kind: "frontier.lang.universalAstLayer",
    version: 1,
    id: input.id ?? `layer:${input.layer ?? "unknown"}`,
    references: input.references ?? [],
    records: input.records ?? [],
    evidenceIds: input.evidenceIds ?? []
  };
}

export function createProofSpecLayer(input = {}) {
  const contracts = normalizeProofRecords(input.contracts, "contract");
  const refinements = normalizeProofRecords(input.refinements, "refinement");
  const invariants = normalizeProofRecords(input.invariants, "invariant");
  const termination = normalizeProofRecords(input.termination, "termination");
  const temporal = normalizeProofRecords(input.temporal, "temporal");
  const obligations = normalizeProofRecords(input.obligations, "obligation");
  const artifacts = normalizeProofRecords(input.artifacts, "artifact");
  const assumptions = normalizeProofRecords(input.assumptions, "assumption");
  return {
    ...input,
    kind: "frontier.lang.proofSpec",
    version: 1,
    id: input.id ?? "proof:spec",
    contracts,
    refinements,
    invariants,
    termination,
    temporal,
    obligations,
    artifacts,
    assumptions,
    evidence: input.evidence ?? []
  };
}

export function createParadigmSemanticsLayer(input = {}) {
  const records = {};
  for (const group of ParadigmSemanticsRecordGroups) {
    records[group] = normalizeParadigmRecords(input[group], ParadigmSemanticsRecordPrefixes[group]);
  }
  return {
    ...input,
    kind: "frontier.lang.paradigmSemantics",
    version: 1,
    id: input.id ?? "paradigm:semantics",
    ...records,
    evidence: input.evidence ?? []
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

export function validateProofSpecLayer(proof, context = {}) {
  const issues = [];
  if (!proof || typeof proof !== "object") {
    return ["Proof spec is not an object"];
  }
  const label = `Proof spec ${proof.id ?? "(unknown)"}`;
  const references = createUniversalAstReferenceIndex({ ...context, proof });
  if (proof.kind !== "frontier.lang.proofSpec") {
    issues.push(`${label} has invalid kind`);
  }
  if (proof.version !== 1) {
    issues.push(`${label} has unsupported version ${proof.version}`);
  }
  if (!proof.id) {
    issues.push("Proof spec is missing id");
  }

  validateProofRecords(proof.contracts, "contract", references, issues);
  validateProofRecords(proof.refinements, "refinement", references, issues);
  validateProofRecords(proof.invariants, "invariant", references, issues);
  validateProofRecords(proof.termination, "termination", references, issues);
  validateProofRecords(proof.temporal, "temporal", references, issues);
  validateProofObligations(proof.obligations, references, issues);
  validateProofArtifacts(proof.artifacts, references, issues);
  validateProofAssumptions(proof.assumptions, references, issues);
  for (const evidence of proof.evidence ?? []) {
    if (!evidence?.id) {
      issues.push(`${label} has evidence without id`);
    }
  }
  return issues;
}

export function validateParadigmSemanticsLayer(paradigmSemantics, context = {}) {
  const issues = [];
  if (!paradigmSemantics || typeof paradigmSemantics !== "object") {
    return ["Paradigm semantics is not an object"];
  }
  const label = `Paradigm semantics ${paradigmSemantics.id ?? "(unknown)"}`;
  const references = createUniversalAstReferenceIndex({ ...context, paradigmSemantics });
  if (paradigmSemantics.kind !== "frontier.lang.paradigmSemantics") {
    issues.push(`${label} has invalid kind`);
  }
  if (paradigmSemantics.version !== 1) {
    issues.push(`${label} has unsupported version ${paradigmSemantics.version}`);
  }
  if (!paradigmSemantics.id) {
    issues.push("Paradigm semantics is missing id");
  }

  const recordIds = collectUniqueIds(collectParadigmRecords(paradigmSemantics), "paradigm record", issues);
  for (const group of ParadigmSemanticsRecordGroups) {
    validateParadigmRecords(paradigmSemantics[group], group, recordIds, references, issues);
  }
  for (const evidence of paradigmSemantics.evidence ?? []) {
    if (!evidence?.id) {
      issues.push(`${label} has evidence without id`);
    }
  }
  return issues;
}

export function validateUniversalAstLayer(layer, context = {}) {
  const issues = [];
  if (!layer || typeof layer !== "object") {
    return ["Universal AST layer is not an object"];
  }

  const label = `Universal AST layer ${layer.id ?? "(unknown)"}`;
  const references = createUniversalAstReferenceIndex(context);
  if (layer.kind !== "frontier.lang.universalAstLayer") {
    issues.push(`${label} has invalid kind`);
  }
  if (layer.version !== 1) {
    issues.push(`${label} has unsupported version ${layer.version}`);
  }
  if (!layer.id) {
    issues.push("Universal AST layer is missing id");
  }
  if (!layer.layer) {
    issues.push(`${label} is missing layer name`);
  }

  validateReferenceIds(layer.nativeSourceIds, references.nativeSourceIds, "native source", label, references, issues);
  validateReferenceIds(layer.nativeAstIds, references.nativeAstIds, "native AST", label, references, issues);
  validateReferenceIds(layer.nativeAstNodeIds, references.nativeAstNodeIds, "native AST node", label, references, issues);
  validateReferenceIds(layer.semanticNodeIds, references.semanticNodeIds, "semantic node", label, references, issues);
  validateReferenceIds(layer.semanticSymbolIds, references.semanticSymbolIds, "semantic symbol", label, references, issues);
  validateReferenceIds(layer.semanticOccurrenceIds, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
  validateReferenceIds(layer.semanticRelationIds, references.semanticRelationIds, "semantic relation", label, references, issues);
  validateReferenceIds(layer.semanticFactIds, references.semanticFactIds, "semantic fact", label, references, issues);
  validateReferenceIds(layer.sourceMapIds, references.sourceMapIds, "source map", label, references, issues);
  validateReferenceIds(layer.sourceMapMappingIds, references.sourceMapMappingIds, "source map mapping", label, references, issues);
  validateReferenceIds(layer.mergeCandidateIds, references.mergeCandidateIds, "merge candidate", label, references, issues);
  validateReferenceIds(layer.paradigmRecordIds, references.paradigmRecordIds, "paradigm record", label, references, issues);
  validateReferenceIds(layer.lossIds, references.lossIds, "loss", label, references, issues);
  validateReferenceIds(layer.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
  validateReferenceIds(layer.effectIds, references.effectIds, "effect", label, references, issues);

  if (layer.semanticIndexId) {
    validateReferenceId(layer.semanticIndexId, references.semanticIndexIds, "semantic index", label, references, issues);
  }

  for (const reference of layer.references ?? []) {
    validateUniversalAstReference(reference, label, references, issues);
  }

  for (const artifact of layer.artifacts ?? []) {
    const artifactLabel = `${label} artifact ${artifact?.id ?? "(unknown)"}`;
    if (!artifact?.id) {
      issues.push(`${label} has artifact without id`);
      continue;
    }
    validateReferenceId(artifact.nativeSourceId, references.nativeSourceIds, "native source", artifactLabel, references, issues);
    validateReferenceId(artifact.nativeAstId, references.nativeAstIds, "native AST", artifactLabel, references, issues);
    validateReferenceId(artifact.nativeAstNodeId, references.nativeAstNodeIds, "native AST node", artifactLabel, references, issues);
    validateReferenceId(artifact.semanticNodeId, references.semanticNodeIds, "semantic node", artifactLabel, references, issues);
    validateReferenceId(artifact.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", artifactLabel, references, issues);
    validateReferenceId(artifact.sourceMapId, references.sourceMapIds, "source map", artifactLabel, references, issues);
    validateReferenceId(artifact.evidenceId, references.evidenceIds, "evidence", artifactLabel, references, issues);
  }

  validateUniversalAstGraph(layer.graph, label, references, issues);
  validateUniversalAstRuntime(layer.runtime, label, references, issues);

  return issues;
}

export function validateSemanticIndexRecord(index) {
  const issues = [];
  if (index.kind !== "frontier.lang.semanticIndex") {
    issues.push(`Semantic index ${index.id ?? "(unknown)"} has invalid kind`);
  }
  if (index.version !== 1) {
    issues.push(`Semantic index ${index.id ?? "(unknown)"} has unsupported version ${index.version}`);
  }

  const documentIds = collectUniqueIds(index.documents ?? [], "document", issues);
  const symbolIds = collectUniqueIds(index.symbols ?? [], "symbol", issues);
  const occurrenceIds = collectUniqueIds(index.occurrences ?? [], "occurrence", issues);
  collectUniqueIds(index.relations ?? [], "relation", issues);
  collectUniqueIds(index.facts ?? [], "fact", issues);

  for (const document of index.documents ?? []) {
    if (!document.path) issues.push(`Semantic index document ${document.id} is missing path`);
    if (!document.language) issues.push(`Semantic index document ${document.id} is missing language`);
  }

  for (const symbol of index.symbols ?? []) {
    if (!symbol.name) issues.push(`Semantic index symbol ${symbol.id} is missing name`);
    if (!symbol.kind) issues.push(`Semantic index symbol ${symbol.id} is missing kind`);
  }

  for (const occurrence of index.occurrences ?? []) {
    if (!documentIds.has(occurrence.documentId)) {
      issues.push(`Semantic index occurrence ${occurrence.id} references missing document ${occurrence.documentId}`);
    }
    if (!symbolIds.has(occurrence.symbolId)) {
      issues.push(`Semantic index occurrence ${occurrence.id} references missing symbol ${occurrence.symbolId}`);
    }
    if (!occurrence.role) issues.push(`Semantic index occurrence ${occurrence.id} is missing role`);
  }

  const graphIds = new Set([
    ...documentIds,
    ...symbolIds,
    ...occurrenceIds,
    ...(index.facts ?? []).map((fact) => fact.id)
  ]);

  for (const relation of index.relations ?? []) {
    if (!graphIds.has(relation.sourceId)) {
      issues.push(`Semantic index relation ${relation.id} references missing source ${relation.sourceId}`);
    }
    if (!graphIds.has(relation.targetId)) {
      issues.push(`Semantic index relation ${relation.id} references missing target ${relation.targetId}`);
    }
    if (!relation.predicate) issues.push(`Semantic index relation ${relation.id} is missing predicate`);
  }

  for (const fact of index.facts ?? []) {
    if (!fact.predicate) issues.push(`Semantic index fact ${fact.id} is missing predicate`);
    if (!graphIds.has(fact.subjectId)) {
      issues.push(`Semantic index fact ${fact.id} references missing subject ${fact.subjectId}`);
    }
    if (fact.objectId && !graphIds.has(fact.objectId)) {
      issues.push(`Semantic index fact ${fact.id} references missing object ${fact.objectId}`);
    }
  }

  return issues;
}

export function createUniversalAstEnvelope(input) {
  const nativeSources = input.nativeSources ?? Object.values(input.document.nodes).filter((node) => node.kind === "nativeSource");
  const losses = input.losses ?? nativeSources.flatMap((source) => source.losses ?? source.ast?.losses ?? []);
  const sourceMaps = input.sourceMaps ?? [];
  const evidence = input.evidence ?? [];
  const mergeCandidates = input.mergeCandidates ?? [];
  const proof = input.proof ? createProofSpecLayer(input.proof) : undefined;
  const paradigmSemantics = input.paradigmSemantics ? createParadigmSemanticsLayer(input.paradigmSemantics) : undefined;
  return {
    ...input,
    kind: "frontier.lang.universalAst",
    version: 1,
    schema: input.schema ?? "frontier.lang.semantic.v1",
    nativeSources,
    sourceMaps,
    losses,
    evidence,
    mergeCandidates,
    ...(proof ? { proof } : {}),
    ...(paradigmSemantics ? { paradigmSemantics } : {}),
    layers: normalizeUniversalAstLayers(input.layers, createDefaultUniversalAstLayers({
      nativeSources,
      semanticIndex: input.semanticIndex,
      sourceMaps,
      losses,
      evidence,
      mergeCandidates,
      proof,
      paradigmSemantics
    }))
  };
}

export function validateUniversalAstEnvelope(envelope) {
  const issues = [];
  if (envelope.kind !== "frontier.lang.universalAst") {
    issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} has invalid kind`);
  }
  if (envelope.version !== 1) {
    issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} has unsupported version ${envelope.version}`);
  }
  if (!envelope.schema) {
    issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} is missing schema`);
  }
  if (!envelope.document || envelope.document.kind !== "frontier.lang.document") {
    issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} is missing a Frontier Lang document`);
  } else {
    issues.push(...validateDocument(envelope.document).map((issue) => `document: ${issue}`));
  }
  const nativeSourceIds = new Set();
  for (const source of envelope.nativeSources ?? []) {
    if (source.kind !== "nativeSource") {
      issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} contains invalid native source ${source.id ?? "(unknown)"}`);
    }
    if (nativeSourceIds.has(source.id)) {
      issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} has duplicate native source ${source.id}`);
    }
    nativeSourceIds.add(source.id);
  }
  if (envelope.semanticIndex) {
    issues.push(...validateSemanticIndexRecord(envelope.semanticIndex).map((issue) => `semanticIndex: ${issue}`));
  }
  if (envelope.proof) {
    issues.push(...validateProofSpecLayer(envelope.proof, { envelope }).map((issue) => `proof: ${issue}`));
  }
  if (envelope.paradigmSemantics) {
    issues.push(...validateParadigmSemanticsLayer(envelope.paradigmSemantics, { envelope }).map((issue) => `paradigmSemantics: ${issue}`));
  }
  for (const sourceMap of envelope.sourceMaps ?? []) {
    issues.push(...validateSourceMapRecord(sourceMap, {
      document: envelope.document,
      nativeSources: envelope.nativeSources,
      semanticIndex: envelope.semanticIndex,
      sourceMaps: envelope.sourceMaps,
      mergeCandidates: envelope.mergeCandidates,
      losses: envelope.losses,
      evidence: envelope.evidence
    }).map((issue) => `sourceMap: ${issue}`));
  }
  if (envelope.layers && typeof envelope.layers !== "object") {
    issues.push(`Universal AST envelope ${envelope.id ?? "(unknown)"} layers must be an object or array`);
  }
  for (const layer of collectUniversalAstLayerRecords(envelope.layers)) {
    issues.push(...validateUniversalAstLayer(layer, { envelope }).map((issue) => `layer: ${issue}`));
  }
  return issues;
}

export function stableUniversalAstJson(envelope) {
  return stableStringify(envelope);
}

export function hashUniversalAstEnvelope(envelope) {
  return hashSemanticValue(envelope);
}

export function createImportResult(input) {
  const result = {
    ...input,
    kind: "frontier.lang.importResult",
    version: 1,
    sourceMaps: input.sourceMaps ?? input.universalAst?.sourceMaps ?? [],
    losses: input.losses ?? [],
    evidence: input.evidence ?? []
  };
  return {
    ...result,
    mergeCandidates: input.mergeCandidates ?? (hasNativeImportMergeSurface(result)
      ? [createSemanticMergeCandidateFromImport({ importResult: result })]
      : [])
  };
}

export function createSemanticMergeCandidateRecord(input) {
  const touchedSymbols = input.touchedSymbols ?? [];
  const touchedSemanticNodes = input.touchedSemanticNodes ?? [];
  const nativeSpans = input.nativeSpans ?? [];
  const conflictKeys = input.conflictKeys ?? collectSemanticMergeConflictKeys({
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans
  });
  return {
    ...input,
    kind: "frontier.lang.semanticMergeCandidate",
    version: 1,
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans,
    conflictKeys,
    readiness: input.readiness ?? "needs-review",
    reasons: input.reasons ?? []
  };
}

export function createSemanticMergeCandidateFromImport(input) {
  const importResult = input.importResult;
  const patch = input.patch ?? importResult.patch;
  const document = input.document ?? importResult.document;
  const semanticIndex = input.semanticIndex ?? importResult.semanticIndex ?? importResult.universalAst?.semanticIndex;
  const nativeAst = input.nativeAst ?? importResult.nativeAst;
  const patchSummary = patch ? summarizePatch(patch) : emptyPatchSummary();
  const semanticTouchIds = collectPatchSemanticTouchIds(document, patchSummary);
  const touchedSymbols = collectTouchedSemanticMergeSymbols(semanticIndex, semanticTouchIds, !patch);
  const touchedSemanticNodes = collectTouchedSemanticMergeNodes(document, semanticIndex, touchedSymbols, semanticTouchIds, !patch);
  const nativeSpans = collectSemanticMergeNativeSpans({
    semanticIndex,
    nativeAst,
    touchedSymbols,
    semanticTouchIds,
    sourcePath: input.sourcePath ?? importResult.sourcePath ?? nativeAst?.sourcePath,
    language: input.language ?? importResult.language ?? nativeAst?.language,
    includeAll: !patch
  });
  const evidence = uniqueEvidence([
    ...(importResult.evidence ?? []),
    ...(patch ? collectPatchEvidence(patch) : []),
    ...(input.evidence ?? [])
  ]);
  const losses = uniqueById([
    ...(importResult.losses ?? []),
    ...(nativeAst?.losses ?? []),
    ...(importResult.universalAst?.losses ?? [])
  ]);
  const readiness = input.readiness
    ? { readiness: input.readiness, reasons: input.reasons ?? [] }
    : inferSemanticMergeReadiness({
      patch,
      patchSummary,
      evidence,
      losses,
      touchedSymbols,
      touchedSemanticNodes
    });

  return createSemanticMergeCandidateRecord({
    id: input.id ?? `merge-candidate:${importResult.id ?? patch?.id ?? semanticIndex?.id ?? nativeAst?.id ?? "unknown"}`,
    importResultId: importResult.id,
    patchId: patch?.id,
    language: input.language ?? importResult.language ?? nativeAst?.language,
    sourcePath: input.sourcePath ?? importResult.sourcePath ?? nativeAst?.sourcePath,
    baseHash: patch?.baseHash,
    targetHash: patch?.targetHash,
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans,
    conflictKeys: collectSemanticMergeConflictKeys({
      touchedSymbols,
      touchedSemanticNodes,
      nativeSpans,
      regions: patchSummary.regions,
      effects: patchSummary.effects
    }),
    readiness: readiness.readiness,
    reasons: readiness.reasons,
    evidence,
    metadata: input.metadata
  });
}

export function createNativeAstMergeCandidate(input) {
  const semanticIndex = input.semanticIndex;
  const nativeAst = input.nativeAst;
  const sourceMaps = input.sourceMaps ?? [];
  const language = input.language ?? nativeAst?.language;
  const sourcePath = input.sourcePath ?? nativeAst?.sourcePath;
  const sourceMapTouchIds = collectSourceMapSemanticTouchIds(sourceMaps);
  const touchedSymbols = collectTouchedSemanticMergeSymbols(semanticIndex, sourceMapTouchIds, true);
  const touchedSemanticNodes = collectTouchedSemanticMergeNodes(input.document, semanticIndex, touchedSymbols, sourceMapTouchIds, false);
  const nativeSpans = uniqueById([
    ...collectSemanticMergeNativeSpans({
      semanticIndex,
      nativeAst,
      touchedSymbols,
      semanticTouchIds: sourceMapTouchIds,
      sourcePath,
      language,
      includeAll: true
    }),
    ...collectSourceMapNativeSpans(sourceMaps, { sourcePath, language })
  ]);
  const subtreeSummary = collectNativeAstSubtreeConflictKeys(nativeAst, {
    sourcePath,
    maxKeys: input.maxSubtreeKeys ?? 100
  });
  const signatureKeys = collectSemanticSignatureConflictKeys(semanticIndex, language);
  const evidence = uniqueEvidence(input.evidence ?? []);
  const losses = uniqueById([
    ...(input.losses ?? []),
    ...(nativeAst?.losses ?? [])
  ]);
  const readiness = input.readiness
    ? { readiness: input.readiness, reasons: input.reasons ?? [] }
    : inferNativeAstMergeReadiness({
      evidence,
      losses,
      touchedSymbols,
      touchedSemanticNodes,
      nativeSpans,
      subtreeSummary
    });

  return createSemanticMergeCandidateRecord({
    id: input.id ?? `merge-candidate:${nativeAst?.id ?? semanticIndex?.id ?? sourceMaps[0]?.id ?? "native-ast"}`,
    language,
    sourcePath,
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans,
    conflictKeys: collectSemanticMergeConflictKeys({
      touchedSymbols,
      touchedSemanticNodes,
      nativeSpans,
      extra: [
        ...subtreeSummary.conflictKeys,
        ...signatureKeys
      ]
    }),
    readiness: readiness.readiness,
    reasons: readiness.reasons,
    evidence,
    metadata: {
      source: "native-ast-merge-candidate",
      nativeAstId: nativeAst?.id,
      semanticIndexId: semanticIndex?.id,
      sourceMapIds: sourceMaps.map((sourceMap) => sourceMap.id),
      subtreeKeyCount: subtreeSummary.conflictKeys.length,
      duplicateSubtreeHashes: subtreeSummary.duplicateHashes,
      truncatedSubtreeKeys: subtreeSummary.truncated,
      signatureKeyCount: signatureKeys.length,
      ...(input.metadata ?? {})
    }
  });
}

export function createPatch(input) {
  return {
    ...input,
    kind: "frontier.lang.patch",
    version: 1
  };
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

export function hashDocumentBase(document) {
  return hashSemanticValue(stripHistory(document));
}

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

export function applySemanticPatch(document, patch, event) {
  if (patch.baseHash && patch.baseHash !== hashDocumentBase(document)) {
    throw new Error(`Patch ${patch.id} base hash does not match document`);
  }

  let nodes = { ...document.nodes };
  let rootIds = [...document.rootIds];

  for (const operation of patch.operations) {
    switch (operation.op) {
      case "upsertNode": {
        nodes = { ...nodes, [operation.node.id]: operation.node };
        if (!operation.node.parentId && !rootIds.includes(operation.node.id)) {
          rootIds = [...rootIds, operation.node.id];
        }
        break;
      }
      case "removeNode": {
        const nextNodes = { ...nodes };
        delete nextNodes[operation.id];
        nodes = nextNodes;
        rootIds = rootIds.filter((id) => id !== operation.id);
        break;
      }
      case "renameNode": {
        const node = requireNode(nodes, operation.id);
        nodes = { ...nodes, [operation.id]: { ...node, name: operation.name } };
        break;
      }
      case "moveNode": {
        const node = requireNode(nodes, operation.id);
        nodes = { ...nodes, [operation.id]: { ...node, parentId: operation.parentId } };
        rootIds = operation.parentId
          ? rootIds.filter((id) => id !== operation.id)
          : unique([...rootIds, operation.id]);
        break;
      }
      case "updateNode": {
        if (
          Object.hasOwn(operation.set, "id") ||
          Object.hasOwn(operation.set, "kind") ||
          Object.hasOwn(operation.set, "parentId")
        ) {
          throw new Error(`Patch ${patch.id} cannot update semantic node identity, kind, or parent`);
        }
        const node = requireNode(nodes, operation.id);
        nodes = { ...nodes, [operation.id]: { ...node, ...operation.set } };
        break;
      }
      case "addEvidence":
        break;
      default:
        throw new Error(`Unexpected operation: ${operation.op}`);
    }
  }

  const next = {
    ...document,
    rootIds,
    nodes
  };

  const issues = validateDocument(next);
  if (issues.length > 0) {
    throw new Error(`Invalid document after patch ${patch.id}: ${issues.join("; ")}`);
  }

  if (patch.targetHash && patch.targetHash !== hashDocumentBase(next)) {
    throw new Error(`Patch ${patch.id} target hash does not match result`);
  }

  return {
    ...next,
    history: [
      ...(document.history ?? []),
      event ?? {
        id: `event:${patch.id}`,
        patch
      }
    ]
  };
}

export function replayDocument(initial, events) {
  return events.reduce((document, event) => applySemanticPatch(document, event.patch, event), initial);
}

export function classifyMerge(base, left, right) {
  const baseHash = hashDocumentBase(base);
  const reasons = [];

  if (left.baseHash && left.baseHash !== baseHash) {
    reasons.push(`Left patch base hash ${left.baseHash} does not match current base ${baseHash}`);
  }
  if (right.baseHash && right.baseHash !== baseHash) {
    reasons.push(`Right patch base hash ${right.baseHash} does not match current base ${baseHash}`);
  }

  validatePatchAgainstBase(base, left, "Left", reasons);
  validatePatchAgainstBase(base, right, "Right", reasons);

  const leftSummary = summarizePatch(left);
  const rightSummary = summarizePatch(right);
  const overlappingNodeIds = intersection(leftSummary.nodeIds, rightSummary.nodeIds);
  const overlappingRegions = intersection(leftSummary.regions, rightSummary.regions);
  const overlappingEffects = intersection(leftSummary.effects, rightSummary.effects);
  const evidence = [...collectPatchEvidence(left), ...collectPatchEvidence(right)];
  const failedEvidence = evidence.filter((record) => record.status === "failed");

  if (reasons.length > 0) {
    return {
      status: "unknown-needs-review",
      autoMergeable: false,
      reasons,
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (failedEvidence.length > 0) {
    return {
      status: "unknown-needs-review",
      autoMergeable: false,
      reasons: [`Failed evidence prevents auto-merge: ${failedEvidence.map((record) => record.id).join(", ")}`],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (stableStringify(left.operations) === stableStringify(right.operations)) {
    return {
      status: "safe-by-same-change",
      autoMergeable: true,
      reasons: ["Both patches contain the same semantic operations."],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  const dynamicEffects = new Set(["dynamic", "eval", "unsafeEval", "ffi", "reflection", "proxy"]);
  const hasDynamic = [...leftSummary.effects, ...rightSummary.effects].some((effect) =>
    dynamicEffects.has(effect)
  );
  if (hasDynamic) {
    return {
      status: "unknown-by-dynamic-effect",
      autoMergeable: false,
      reasons: ["At least one patch touches a dynamic or opaque effect boundary."],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (overlappingEffects.length > 0) {
    return {
      status: "conflict-by-effect-overlap",
      autoMergeable: false,
      reasons: [`Both patches touch effect(s): ${overlappingEffects.join(", ")}`],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  if (overlappingNodeIds.length > 0 || overlappingRegions.length > 0) {
    const laws = collectMergeLaws(base, [...overlappingNodeIds, ...overlappingRegions]);
    if (hasAutoMergeLawSet(laws)) {
      return withReplayGate(base, left, right, {
        status: "safe-by-merge-law",
        autoMergeable: true,
        reasons: [`Overlaps are covered by merge law(s): ${unique(laws).join(", ")}`],
        overlappingNodeIds,
        overlappingRegions,
        overlappingEffects,
        evidence
      });
    }

    return {
      status: "conflict-by-overlap",
      autoMergeable: false,
      reasons: ["Patches touch the same semantic node or region without a known merge law."],
      overlappingNodeIds,
      overlappingRegions,
      overlappingEffects,
      evidence
    };
  }

  return withReplayGate(base, left, right, {
    status: "safe-by-disjoint-region",
    autoMergeable: true,
    reasons: ["Patches touch disjoint semantic nodes, regions, and effects."],
    overlappingNodeIds,
    overlappingRegions,
    overlappingEffects,
    evidence
  });
}

function validatePatchAgainstBase(base, patch, label, reasons) {
  try {
    applySemanticPatch(base, patch);
  } catch (error) {
    reasons.push(`${label} patch cannot be applied to base: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function stripHistory(document) {
  const { history: _history, ...rest } = document;
  return rest;
}

function requireNode(nodes, id) {
  const node = nodes[id];
  if (!node) {
    throw new Error(`Unknown semantic node id: ${id}`);
  }
  return node;
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

function summarizePatch(patch) {
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

function collectPatchEvidence(patch) {
  const evidence = [...(patch.evidence ?? [])];
  for (const operation of patch.operations) {
    if (operation.op === "addEvidence") {
      evidence.push(operation.evidence);
    }
  }
  return evidence;
}

function hasNativeImportMergeSurface(result) {
  return Boolean(result.patch || result.nativeAst || result.semanticIndex || result.universalAst?.semanticIndex);
}

function emptyPatchSummary() {
  return { nodeIds: [], regions: [], effects: [] };
}

function collectPatchSemanticTouchIds(document, patchSummary) {
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

function collectSemanticRegionOwners(document) {
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

function collectTouchedSemanticMergeSymbols(semanticIndex, semanticTouchIds, includeAll) {
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

function collectTouchedSemanticMergeNodes(document, semanticIndex, touchedSymbols, semanticTouchIds, includeAll) {
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

function collectSemanticMergeNativeSpans(input) {
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

function spanWithFallbackPath(span, path) {
  return {
    ...span,
    path: span.path ?? path
  };
}

function nativeSpanConflictKey(span, nativeAstNodeId) {
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

function collectSemanticMergeConflictKeys(input) {
  return unique([
    ...(input.touchedSymbols ?? []).map((symbol) => symbol.conflictKey ?? `symbol:${symbol.id}`),
    ...(input.touchedSemanticNodes ?? []).map((node) => node.conflictKey ?? `node:${node.id}`),
    ...(input.nativeSpans ?? []).map((span) => span.conflictKey),
    ...(input.regions ?? []).map((region) => `region:${region}`),
    ...(input.effects ?? []).map((effect) => `effect:${effect}`),
    ...(input.extra ?? [])
  ].filter(Boolean)).sort(ordinalCompare);
}

function collectSourceMapSemanticTouchIds(sourceMaps) {
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

function collectSourceMapNativeSpans(sourceMaps, input) {
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

function collectNativeAstSubtreeConflictKeys(nativeAst, options = {}) {
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

function nativeAstSubtreeHash(nativeAst, nodeId, cache, seen) {
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

function collectSemanticSignatureConflictKeys(semanticIndex, language) {
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

function inferNativeAstMergeReadiness(input) {
  const failedEvidence = input.evidence.filter((record) => record.status === "failed");
  if (failedEvidence.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Failed evidence prevents merge: ${failedEvidence.map((record) => record.id).join(", ")}`]
    };
  }

  const errorLosses = input.losses.filter((record) => record.severity === "error");
  if (errorLosses.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Native AST loss error(s) require repair: ${errorLosses.map((record) => record.id).join(", ")}`]
    };
  }

  if (input.touchedSymbols.length === 0 && input.touchedSemanticNodes.length === 0 && input.nativeSpans.length === 0) {
    return {
      readiness: "needs-review",
      reasons: ["Native AST candidate has no symbol, semantic node, or span anchors."]
    };
  }

  if (!input.evidence.some((record) => record.status === "passed")) {
    return {
      readiness: "needs-review",
      reasons: ["Native AST candidate has no passed evidence record."]
    };
  }

  if (input.losses.length > 0 || input.subtreeSummary.duplicateHashes.length > 0 || input.subtreeSummary.truncated) {
    return {
      readiness: "ready-with-losses",
      reasons: [
        "Native AST candidate has usable anchors but includes non-blocking loss or ambiguous subtree evidence."
      ]
    };
  }

  return {
    readiness: "ready",
    reasons: ["Native AST candidate has deterministic symbol/node/span anchors and passed evidence."]
  };
}

function inferSemanticMergeReadiness(input) {
  const failedEvidence = input.evidence.filter((record) => record.status === "failed");
  if (failedEvidence.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Failed evidence prevents merge: ${failedEvidence.map((record) => record.id).join(", ")}`]
    };
  }

  const errorLosses = input.losses.filter((record) => record.severity === "error");
  if (errorLosses.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Native import loss error(s) require repair: ${errorLosses.map((record) => record.id).join(", ")}`]
    };
  }

  if (!input.patch) {
    return {
      readiness: "needs-review",
      reasons: ["No semantic patch was attached to the native import result."]
    };
  }

  if (input.patch.risk === "high" || input.patch.risk === "unknown") {
    return {
      readiness: "needs-review",
      reasons: [`Patch risk is ${input.patch.risk}.`]
    };
  }

  const dynamicEffects = new Set(["dynamic", "eval", "unsafeEval", "ffi", "reflection", "proxy"]);
  const dynamicTouched = input.patchSummary.effects.filter((effect) => dynamicEffects.has(effect));
  if (dynamicTouched.length > 0) {
    return {
      readiness: "needs-review",
      reasons: [`Patch touches dynamic effect boundary: ${unique(dynamicTouched).join(", ")}`]
    };
  }

  if (input.touchedSymbols.length === 0 && input.touchedSemanticNodes.length === 0) {
    return {
      readiness: "needs-review",
      reasons: ["Merge candidate has no touched symbols or semantic nodes."]
    };
  }

  if (input.losses.length > 0) {
    return {
      readiness: "ready-with-losses",
      reasons: [`Native import recorded non-blocking loss(es): ${input.losses.map((record) => record.id).join(", ")}`]
    };
  }

  return {
    readiness: "ready",
    reasons: ["Native import candidate has patch, semantic touches, and no blocking evidence."]
  };
}

function groupOccurrencesBySymbol(occurrences) {
  const groups = new Map();
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.symbolId) ?? [];
    group.push(occurrence);
    groups.set(occurrence.symbolId, group);
  }
  return groups;
}

function uniqueEvidence(records) {
  return uniqueById(records);
}

function uniqueById(records) {
  const seen = new Set();
  const result = [];
  for (const record of records) {
    if (!record?.id || seen.has(record.id)) {
      continue;
    }
    seen.add(record.id);
    result.push(record);
  }
  return result;
}

function withReplayGate(base, left, right, admission) {
  if (!admission.autoMergeable) {
    return admission;
  }

  try {
    const leftForReplay = stripPatchAdmissionHashes(left);
    const rightForReplay = stripPatchAdmissionHashes(right);
    const leftThenRight = applySemanticPatch(applySemanticPatch(base, leftForReplay), rightForReplay);
    const rightThenLeft = applySemanticPatch(applySemanticPatch(base, rightForReplay), leftForReplay);
    const leftHash = hashDocumentBase(leftThenRight);
    const rightHash = hashDocumentBase(rightThenLeft);
    if (leftHash !== rightHash) {
      return {
        ...admission,
        status: "unknown-needs-review",
        autoMergeable: false,
        reasons: [
          ...admission.reasons,
          `Replay order is not commutative: left-right ${leftHash}, right-left ${rightHash}`
        ]
      };
    }
    return admission;
  } catch (error) {
    return {
      ...admission,
      status: "unknown-needs-review",
      autoMergeable: false,
      reasons: [...admission.reasons, `Replay gate failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

function stripPatchAdmissionHashes(patch) {
  const { baseHash: _baseHash, targetHash: _targetHash, ...rest } = patch;
  return rest;
}

function collectMergeLaws(document, overlaps) {
  const overlapSet = new Set(overlaps);
  const laws = [];

  for (const node of Object.values(document.nodes)) {
    if (node.kind === "lattice" && (overlapSet.has(node.id) || overlapSet.has(node.name))) {
      laws.push(...(node.laws ?? []));
    }

    if (node.kind === "entity") {
      for (const field of node.fields) {
        if (overlapSet.has(field.id) || overlapSet.has(`${node.name}.${field.name}`)) {
          if (field.merge?.law) {
            laws.push(field.merge.law);
          }
          laws.push(...(field.merge?.laws ?? []));
          laws.push(...collectReferencedLatticeLaws(document, field.merge?.latticeId));
          laws.push(...collectReferencedLatticeLaws(document, field.semantic?.latticeId));
        }
      }
    }
    if (node.kind === "state") {
      for (const collection of node.collections) {
        if (overlapSet.has(collection.id) || overlapSet.has(`${node.name}.${collection.name}`)) {
          if (collection.merge?.law) {
            laws.push(collection.merge.law);
          }
          laws.push(...(collection.merge?.laws ?? []));
          laws.push(...collectReferencedLatticeLaws(document, collection.merge?.latticeId));
          laws.push(...collectReferencedLatticeLaws(document, collection.semantic?.latticeId));
        }
      }
    }
  }

  return laws;
}

function validateLatticeReference(document, nodeIds, nodeNames, latticeId, context, issues) {
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

function collectReferencedLatticeLaws(document, latticeId) {
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

function hasAutoMergeLawSet(laws) {
  if (laws.length === 0) {
    return false;
  }
  const allowed = new Set(["semilattice", "commutative", "associative", "idempotent"]);
  if (!laws.every((law) => allowed.has(law))) {
    return false;
  }
  return laws.includes("semilattice") || laws.includes("commutative");
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    if (seen.has(value) && !duplicates.includes(value)) {
      duplicates.push(value);
    }
    seen.add(value);
  }
  return duplicates;
}

function collectNativeSourceIds(document, nativeSources) {
  return new Set([
    ...(nativeSources ?? []).map((source) => source.id),
    ...Object.values(document?.nodes ?? {})
      .filter((node) => node.kind === "nativeSource")
      .map((node) => node.id)
  ]);
}

function collectNativeAstNodeIds(nativeAst, nativeSources) {
  return new Set([
    ...Object.keys(nativeAst?.nodes ?? {}),
    ...(nativeSources ?? []).flatMap((source) => Object.keys(source.ast?.nodes ?? {}))
  ]);
}

function createDefaultUniversalAstLayers(input) {
  const layers = {};
  const nativeSourceIds = input.nativeSources.map((source) => source.id);
  const nativeAstIds = unique(input.nativeSources.map((source) => source.ast?.id).filter(Boolean));
  const nativeAstNodeIds = unique(input.nativeSources.flatMap((source) => Object.keys(source.ast?.nodes ?? {})));
  const lossIds = input.losses.map((loss) => loss.id).filter(Boolean);

  if (nativeSourceIds.length > 0 || lossIds.length > 0) {
    layers.losslessSource = createUniversalAstLayer({
      id: "layer:losslessSource",
      layer: "losslessSource",
      nativeSourceIds,
      nativeAstIds,
      lossIds
    });
  }

  if (nativeAstIds.length > 0 || nativeAstNodeIds.length > 0) {
    layers.cst = createUniversalAstLayer({
      id: "layer:cst",
      layer: "cst",
      nativeSourceIds,
      nativeAstIds,
      nativeAstNodeIds
    });
  }

  if (input.semanticIndex) {
    layers.semanticSymbols = createUniversalAstLayer({
      id: "layer:semanticSymbols",
      layer: "semanticSymbols",
      semanticIndexId: input.semanticIndex.id,
      semanticSymbolIds: (input.semanticIndex.symbols ?? []).map((symbol) => symbol.id),
      semanticOccurrenceIds: (input.semanticIndex.occurrences ?? []).map((occurrence) => occurrence.id),
      semanticRelationIds: (input.semanticIndex.relations ?? []).map((relation) => relation.id),
      semanticFactIds: (input.semanticIndex.facts ?? []).map((fact) => fact.id),
      evidenceIds: (input.semanticIndex.evidence ?? []).map((record) => record.id)
    });
  }

  if (input.sourceMaps.length > 0) {
    layers.projectionEvidence = createUniversalAstLayer({
      id: "layer:projectionEvidence",
      layer: "projectionEvidence",
      sourceMapIds: input.sourceMaps.map((sourceMap) => sourceMap.id),
      sourceMapMappingIds: input.sourceMaps.flatMap((sourceMap) =>
        (sourceMap.mappings ?? []).map((mapping) => `${sourceMap.id}:${mapping.id}`)
      ),
      evidenceIds: input.sourceMaps.flatMap((sourceMap) => (sourceMap.evidence ?? []).map((record) => record.id))
    });
  }

  if (input.proof) {
    layers.proofSpec = createUniversalAstLayer({
      id: "layer:proofSpec",
      layer: "proofSpec",
      records: [{
        proofSpecId: input.proof.id,
        contracts: input.proof.contracts.length,
        refinements: input.proof.refinements.length,
        invariants: input.proof.invariants.length,
        termination: input.proof.termination.length,
        temporal: input.proof.temporal.length,
        obligations: input.proof.obligations.length,
        artifacts: input.proof.artifacts.length,
        assumptions: input.proof.assumptions.length
      }],
      references: [
        ...input.proof.contracts.map((record) => ({ kind: "proofContract", id: record.id })),
        ...input.proof.refinements.map((record) => ({ kind: "proofContract", id: record.id })),
        ...input.proof.invariants.map((record) => ({ kind: "proofContract", id: record.id })),
        ...input.proof.termination.map((record) => ({ kind: "proofContract", id: record.id })),
        ...input.proof.temporal.map((record) => ({ kind: "proofContract", id: record.id })),
        ...input.proof.obligations.map((record) => ({ kind: "proofObligation", id: record.id })),
        ...input.proof.artifacts.map((record) => ({ kind: "proofArtifact", id: record.id })),
        ...input.proof.assumptions.map((record) => ({ kind: "proofAssumption", id: record.id }))
      ],
      evidenceIds: collectProofEvidenceIds(input.proof)
    });
  }

  if (input.paradigmSemantics) {
    const records = collectParadigmRecordEntries(input.paradigmSemantics);
    layers.paradigmSemantics = createUniversalAstLayer({
      id: "layer:paradigmSemantics",
      layer: "paradigmSemantics",
      records: [{
        paradigmSemanticsId: input.paradigmSemantics.id,
        ...Object.fromEntries(ParadigmSemanticsRecordGroups.map((group) => [
          group,
          (input.paradigmSemantics[group] ?? []).length
        ]))
      }],
      paradigmRecordIds: records.map((entry) => entry.record.id).filter(Boolean),
      references: records
        .filter((entry) => entry.record.id)
        .map((entry) => ({
          kind: "paradigmRecord",
          id: entry.record.id,
          metadata: { group: entry.group }
        })),
      evidenceIds: collectParadigmEvidenceIds(input.paradigmSemantics)
    });
  }

  if (input.mergeCandidates.length > 0 || input.evidence.length > 0) {
    layers.mergeEvidence = createUniversalAstLayer({
      id: "layer:mergeEvidence",
      layer: "mergeEvidence",
      mergeCandidateIds: input.mergeCandidates.map((candidate) => candidate.id),
      evidenceIds: unique([
        ...input.evidence.map((record) => record.id),
        ...input.mergeCandidates.flatMap((candidate) => (candidate.evidence ?? []).map((record) => record.id))
      ].filter(Boolean))
    });
  }

  return layers;
}

function normalizeUniversalAstLayers(input, defaults = {}) {
  const normalized = { ...defaults };
  if (!input) {
    return normalized;
  }

  const entries = Array.isArray(input) ? input.map((layer) => [layer?.layer ?? layer?.id, layer]) : Object.entries(input);
  for (const [key, value] of entries) {
    const records = Array.isArray(value) ? value : [value];
    for (const record of records) {
      if (!record || typeof record !== "object") {
        continue;
      }
      const layer = record.layer ?? key;
      normalized[layer] = createUniversalAstLayer({
        ...record,
        id: record.id ?? `layer:${layer}`,
        layer
      });
    }
  }
  return normalized;
}

function collectUniversalAstLayerRecords(layers) {
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

function createUniversalAstReferenceIndex(context = {}) {
  const envelope = context.envelope;
  const document = context.document ?? envelope?.document;
  const nativeSources = uniqueById([
    ...(context.nativeSources ?? []),
    ...(envelope?.nativeSources ?? []),
    ...Object.values(document?.nodes ?? {}).filter((node) => node.kind === "nativeSource")
  ]);
  const semanticIndex = context.semanticIndex ?? envelope?.semanticIndex;
  const sourceMaps = context.sourceMaps ?? envelope?.sourceMaps ?? [];
  const mergeCandidates = context.mergeCandidates ?? envelope?.mergeCandidates ?? [];
  const layers = collectUniversalAstLayerRecords(context.layers ?? envelope?.layers);
  const proof = context.proof ?? envelope?.proof;
  const paradigmSemantics = context.paradigmSemantics ?? envelope?.paradigmSemantics;
  const nativeAsts = uniqueById([
    context.nativeAst,
    ...nativeSources.map((source) => source.ast)
  ].filter(Boolean));
  const sourceMapMappingIds = [];
  for (const sourceMap of sourceMaps) {
    for (const mapping of sourceMap.mappings ?? []) {
      if (!mapping?.id) continue;
      sourceMapMappingIds.push(mapping.id);
      sourceMapMappingIds.push(`${sourceMap.id}:${mapping.id}`);
    }
  }

  const evidence = [
    ...(context.evidence ?? []),
    ...(envelope?.evidence ?? []),
    ...(semanticIndex?.evidence ?? []),
    ...(proof?.evidence ?? []),
    ...(paradigmSemantics?.evidence ?? []),
    ...sourceMaps.flatMap((sourceMap) => sourceMap.evidence ?? []),
    ...mergeCandidates.flatMap((candidate) => candidate.evidence ?? [])
  ];
  const losses = [
    ...(context.losses ?? []),
    ...(envelope?.losses ?? []),
    ...nativeSources.flatMap((source) => source.losses ?? []),
    ...nativeAsts.flatMap((nativeAst) => nativeAst.losses ?? [])
  ];

  return {
    strict: Boolean(context.strict ?? envelope),
    layerIds: new Set(layers.map((layer) => layer?.id).filter(Boolean)),
    layerNames: new Set(layers.map((layer) => layer?.layer).filter(Boolean)),
    nativeSourceIds: new Set(nativeSources.map((source) => source.id).filter(Boolean)),
    nativeAstIds: new Set(nativeAsts.map((nativeAst) => nativeAst.id).filter(Boolean)),
    nativeAstNodeIds: new Set(nativeAsts.flatMap((nativeAst) => Object.keys(nativeAst.nodes ?? {}))),
    semanticNodeIds: new Set(Object.keys(document?.nodes ?? {})),
    semanticIndexIds: new Set([semanticIndex?.id].filter(Boolean)),
    semanticSymbolIds: new Set((semanticIndex?.symbols ?? []).map((symbol) => symbol.id)),
    semanticOccurrenceIds: new Set((semanticIndex?.occurrences ?? []).map((occurrence) => occurrence.id)),
    semanticRelationIds: new Set((semanticIndex?.relations ?? []).map((relation) => relation.id)),
    semanticFactIds: new Set((semanticIndex?.facts ?? []).map((fact) => fact.id)),
    sourceMapIds: new Set(sourceMaps.map((sourceMap) => sourceMap.id).filter(Boolean)),
    sourceMapMappingIds: new Set(sourceMapMappingIds),
    mergeCandidateIds: new Set(mergeCandidates.map((candidate) => candidate.id).filter(Boolean)),
    proofContractIds: new Set([
      ...(proof?.contracts ?? []),
      ...(proof?.refinements ?? []),
      ...(proof?.invariants ?? []),
      ...(proof?.termination ?? []),
      ...(proof?.temporal ?? [])
    ].map((record) => record.id).filter(Boolean)),
    proofObligationIds: new Set((proof?.obligations ?? []).map((record) => record.id).filter(Boolean)),
    proofArtifactIds: new Set((proof?.artifacts ?? []).map((record) => record.id).filter(Boolean)),
    proofAssumptionIds: new Set((proof?.assumptions ?? []).map((record) => record.id).filter(Boolean)),
    paradigmRecordIds: new Set(collectParadigmRecords(paradigmSemantics).map((record) => record.id).filter(Boolean)),
    lossIds: new Set(losses.map((loss) => loss.id).filter(Boolean)),
    evidenceIds: new Set(evidence.map((record) => record.id).filter(Boolean)),
    effectIds: collectEffectReferenceIds(document)
  };
}

function collectEffectReferenceIds(document) {
  const ids = [];
  for (const node of Object.values(document?.nodes ?? {})) {
    if (node.kind === "effect" || node.kind === "capability") {
      ids.push(node.id, node.name, node.capability);
    }
    if (node.kind === "action") {
      ids.push(...(node.uses ?? []));
    }
    for (const region of node.regions ?? []) {
      if (region.access === "effect") {
        ids.push(region.id);
      }
    }
  }
  return new Set(ids.filter(Boolean));
}

function normalizeProofRecords(records, prefix) {
  return (records ?? []).map((record, index) => ({
    ...record,
    id: record.id ?? `${prefix}:${index + 1}`,
    evidenceIds: record.evidenceIds ?? []
  }));
}

function normalizeParadigmRecords(records, prefix) {
  return (records ?? []).map((record, index) => ({
    ...record,
    id: record.id ?? `${prefix}:${index + 1}`,
    kind: record.kind ?? prefix,
    evidenceIds: record.evidenceIds ?? [],
    lossIds: record.lossIds ?? [],
    effectIds: record.effectIds ?? [],
    relatedRecordIds: record.relatedRecordIds ?? []
  }));
}

function collectParadigmRecordEntries(paradigmSemantics) {
  if (!paradigmSemantics || typeof paradigmSemantics !== "object") {
    return [];
  }
  return ParadigmSemanticsRecordGroups.flatMap((group) =>
    (paradigmSemantics[group] ?? []).map((record) => ({ group, record }))
  );
}

function collectParadigmRecords(paradigmSemantics) {
  return collectParadigmRecordEntries(paradigmSemantics).map((entry) => entry.record);
}

function validateParadigmRecords(records, group, paradigmRecordIds, references, issues) {
  for (const record of records ?? []) {
    const label = `Paradigm ${group} record ${record?.id ?? "(unknown)"}`;
    if (!record?.id) {
      issues.push(`Paradigm ${group} record is missing id`);
      continue;
    }
    if (!record.kind) {
      issues.push(`${label} is missing kind`);
    }
    validateParadigmSubject(record, label, references, issues);
    validateReferenceId(record.semanticNodeId, references.semanticNodeIds, "semantic node", label, references, issues);
    validateReferenceId(record.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", label, references, issues);
    validateReferenceId(record.semanticOccurrenceId, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
    validateReferenceId(record.nativeSourceId, references.nativeSourceIds, "native source", label, references, issues);
    validateReferenceId(record.nativeAstId, references.nativeAstIds, "native AST", label, references, issues);
    validateReferenceId(record.nativeAstNodeId, references.nativeAstNodeIds, "native AST node", label, references, issues);
    validateReferenceId(record.sourceMapId, references.sourceMapIds, "source map", label, references, issues);
    validateReferenceId(record.sourceMapMappingId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
    validateReferenceIds(record.effectIds, references.effectIds, "effect", label, references, issues);
    validateReferenceIds(record.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
    validateReferenceIds(record.lossIds, references.lossIds, "loss", label, references, issues);
    validateReferenceIds(record.relatedRecordIds, paradigmRecordIds, "paradigm record", label, references, issues);
    for (const field of [
      "bindingScopeId",
      "parentScopeId",
      "bindingId",
      "patternId",
      "typeConstraintId",
      "evaluationModelId",
      "memoryLocationId",
      "effectRegionId",
      "controlRegionId",
      "logicProgramId",
      "actorSystemId",
      "stackEffectId",
      "arrayShapeId",
      "numericKernelId",
      "dataflowNetworkId",
      "clockModelId",
      "objectModelId",
      "macroExpansionId",
      "reflectionBoundaryId",
      "loweringRecordId",
      "sourceRecordId",
      "targetRecordId"
    ]) {
      validateReferenceId(record[field], paradigmRecordIds, "paradigm record", label, references, issues);
    }
    validateSourceSpan(record.sourceSpan, `${label} source span`, issues);
    validateSourceSpan(record.generatedSpan, `${label} generated span`, issues);
  }
}

function validateProofRecords(records, group, references, issues) {
  collectUniqueIds(records ?? [], group, issues);
  for (const record of records ?? []) {
    const label = `Proof ${group} ${record?.id ?? "(unknown)"}`;
    if (!record?.id) {
      issues.push(`Proof ${group} is missing id`);
      continue;
    }
    if (!record.kind) {
      issues.push(`${label} is missing kind`);
    }
    if (!record.statement && !record.expression) {
      issues.push(`${label} is missing statement or expression`);
    }
    validateProofSubject(record, label, references, issues);
    validateReferenceIds(record.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
    validateReferenceIds(record.lossIds, references.lossIds, "loss", label, references, issues);
    validateReferenceId(record.sourceMapId, references.sourceMapIds, "source map", label, references, issues);
    validateReferenceId(record.sourceMapMappingId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
    validateSourceSpan(record.sourceSpan, `${label} source span`, issues);
    validateSourceSpan(record.generatedSpan, `${label} generated span`, issues);
  }
}

function validateProofObligations(obligations, references, issues) {
  collectUniqueIds(obligations ?? [], "proof obligation", issues);
  for (const obligation of obligations ?? []) {
    const label = `Proof obligation ${obligation?.id ?? "(unknown)"}`;
    if (!obligation?.id) {
      issues.push("Proof obligation is missing id");
      continue;
    }
    if (!obligation.kind) {
      issues.push(`${label} is missing kind`);
    }
    if (!obligation.status) {
      issues.push(`${label} is missing status`);
    }
    if (!obligation.statement && !obligation.expression) {
      issues.push(`${label} is missing statement or expression`);
    }
    validateProofSubject(obligation, label, references, issues);
    validateReferenceIds(obligation.contractIds, references.proofContractIds, "proof contract", label, references, issues);
    validateReferenceIds(obligation.assumptionIds, references.proofAssumptionIds, "proof assumption", label, references, issues);
    validateReferenceIds(obligation.artifactIds, references.proofArtifactIds, "proof artifact", label, references, issues);
    validateReferenceIds(obligation.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
    validateReferenceIds(obligation.lossIds, references.lossIds, "loss", label, references, issues);
    validateSourceSpan(obligation.sourceSpan, `${label} source span`, issues);
  }
}

function validateProofArtifacts(artifacts, references, issues) {
  collectUniqueIds(artifacts ?? [], "proof artifact", issues);
  for (const artifact of artifacts ?? []) {
    const label = `Proof artifact ${artifact?.id ?? "(unknown)"}`;
    if (!artifact?.id) {
      issues.push("Proof artifact is missing id");
      continue;
    }
    if (!artifact.kind) {
      issues.push(`${label} is missing kind`);
    }
    validateReferenceIds(artifact.obligationIds, references.proofObligationIds, "proof obligation", label, references, issues);
    validateReferenceIds(artifact.assumptionIds, references.proofAssumptionIds, "proof assumption", label, references, issues);
    validateReferenceIds(artifact.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
  }
}

function validateProofAssumptions(assumptions, references, issues) {
  collectUniqueIds(assumptions ?? [], "proof assumption", issues);
  for (const assumption of assumptions ?? []) {
    const label = `Proof assumption ${assumption?.id ?? "(unknown)"}`;
    if (!assumption?.id) {
      issues.push("Proof assumption is missing id");
      continue;
    }
    if (!assumption.scope) {
      issues.push(`${label} is missing scope`);
    }
    validateProofSubject(assumption, label, references, issues);
    validateReferenceIds(assumption.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
  }
}

function validateProofSubject(record, label, references, issues) {
  if (!record?.subjectId) {
    return;
  }
  const kind = record.subjectKind ?? inferProofSubjectKind(record.subjectId, references);
  switch (kind) {
    case "semanticNode":
      validateReferenceId(record.subjectId, references.semanticNodeIds, "semantic node", label, references, issues);
      break;
    case "semanticSymbol":
      validateReferenceId(record.subjectId, references.semanticSymbolIds, "semantic symbol", label, references, issues);
      break;
    case "semanticOccurrence":
      validateReferenceId(record.subjectId, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
      break;
    case "nativeSource":
      validateReferenceId(record.subjectId, references.nativeSourceIds, "native source", label, references, issues);
      break;
    case "nativeAst":
      validateReferenceId(record.subjectId, references.nativeAstIds, "native AST", label, references, issues);
      break;
    case "nativeAstNode":
      validateReferenceId(record.subjectId, references.nativeAstNodeIds, "native AST node", label, references, issues);
      break;
    case "sourceMap":
      validateReferenceId(record.subjectId, references.sourceMapIds, "source map", label, references, issues);
      break;
    case "sourceMapMapping":
      validateReferenceId(record.subjectId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
      break;
    case "effect":
      validateReferenceId(record.subjectId, references.effectIds, "effect", label, references, issues);
      break;
    default:
      if (references.strict) {
        issues.push(`${label} references unknown proof subject ${record.subjectId}`);
      }
      break;
  }
}

function inferProofSubjectKind(id, references) {
  if (references.semanticNodeIds.has(id)) return "semanticNode";
  if (references.semanticSymbolIds.has(id)) return "semanticSymbol";
  if (references.semanticOccurrenceIds.has(id)) return "semanticOccurrence";
  if (references.nativeSourceIds.has(id)) return "nativeSource";
  if (references.nativeAstIds.has(id)) return "nativeAst";
  if (references.nativeAstNodeIds.has(id)) return "nativeAstNode";
  if (references.sourceMapIds.has(id)) return "sourceMap";
  if (references.sourceMapMappingIds.has(id)) return "sourceMapMapping";
  if (references.effectIds.has(id)) return "effect";
  return undefined;
}

function validateParadigmSubject(record, label, references, issues) {
  if (!record?.subjectId) {
    return;
  }
  const kind = record.subjectKind ?? inferProofSubjectKind(record.subjectId, references);
  switch (kind) {
    case "semanticNode":
      validateReferenceId(record.subjectId, references.semanticNodeIds, "semantic node", label, references, issues);
      break;
    case "semanticSymbol":
      validateReferenceId(record.subjectId, references.semanticSymbolIds, "semantic symbol", label, references, issues);
      break;
    case "semanticOccurrence":
      validateReferenceId(record.subjectId, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
      break;
    case "semanticRelation":
      validateReferenceId(record.subjectId, references.semanticRelationIds, "semantic relation", label, references, issues);
      break;
    case "semanticFact":
      validateReferenceId(record.subjectId, references.semanticFactIds, "semantic fact", label, references, issues);
      break;
    case "nativeSource":
      validateReferenceId(record.subjectId, references.nativeSourceIds, "native source", label, references, issues);
      break;
    case "nativeAst":
      validateReferenceId(record.subjectId, references.nativeAstIds, "native AST", label, references, issues);
      break;
    case "nativeAstNode":
      validateReferenceId(record.subjectId, references.nativeAstNodeIds, "native AST node", label, references, issues);
      break;
    case "sourceMap":
      validateReferenceId(record.subjectId, references.sourceMapIds, "source map", label, references, issues);
      break;
    case "sourceMapMapping":
      validateReferenceId(record.subjectId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
      break;
    case "effect":
      validateReferenceId(record.subjectId, references.effectIds, "effect", label, references, issues);
      break;
    default:
      if (references.strict) {
        issues.push(`${label} references unknown paradigm subject ${record.subjectId}`);
      }
      break;
  }
}

function collectProofEvidenceIds(proof) {
  if (!proof) return [];
  return unique([
    ...(proof.evidence ?? []).map((record) => record.id),
    ...proof.contracts.flatMap((record) => record.evidenceIds ?? []),
    ...proof.refinements.flatMap((record) => record.evidenceIds ?? []),
    ...proof.invariants.flatMap((record) => record.evidenceIds ?? []),
    ...proof.termination.flatMap((record) => record.evidenceIds ?? []),
    ...proof.temporal.flatMap((record) => record.evidenceIds ?? []),
    ...proof.obligations.flatMap((record) => record.evidenceIds ?? []),
    ...proof.artifacts.flatMap((record) => record.evidenceIds ?? []),
    ...proof.assumptions.flatMap((record) => record.evidenceIds ?? [])
  ].filter(Boolean));
}

function collectParadigmEvidenceIds(paradigmSemantics) {
  if (!paradigmSemantics) return [];
  return unique([
    ...(paradigmSemantics.evidence ?? []).map((record) => record.id),
    ...collectParadigmRecords(paradigmSemantics).flatMap((record) => record.evidenceIds ?? [])
  ].filter(Boolean));
}

function validateReferenceIds(ids, targetIds, targetLabel, label, references, issues) {
  const seen = new Set();
  for (const id of ids ?? []) {
    if (!id) {
      issues.push(`${label} has empty ${targetLabel} reference`);
      continue;
    }
    if (seen.has(id)) {
      issues.push(`${label} has duplicate ${targetLabel} reference ${id}`);
    }
    seen.add(id);
    validateReferenceId(id, targetIds, targetLabel, label, references, issues);
  }
}

function validateReferenceId(id, targetIds, targetLabel, label, references, issues) {
  if (!id) {
    return;
  }
  if ((references.strict || targetIds.size > 0) && !targetIds.has(id)) {
    issues.push(`${label} references missing ${targetLabel} ${id}`);
  }
}

function validateUniversalAstReference(reference, label, references, issues) {
  if (!reference || typeof reference !== "object") {
    issues.push(`${label} has invalid reference`);
    return;
  }
  if (!reference.kind) {
    issues.push(`${label} reference ${reference.id ?? "(unknown)"} is missing kind`);
  }
  if (!reference.id) {
    issues.push(`${label} has reference without id`);
    return;
  }
  switch (reference.kind) {
    case "layer":
      validateReferenceId(reference.id, new Set([...references.layerIds, ...references.layerNames]), "layer", label, references, issues);
      break;
    case "nativeSource":
      validateReferenceId(reference.id, references.nativeSourceIds, "native source", label, references, issues);
      break;
    case "nativeAst":
      validateReferenceId(reference.id, references.nativeAstIds, "native AST", label, references, issues);
      break;
    case "nativeAstNode":
      validateReferenceId(reference.id, references.nativeAstNodeIds, "native AST node", label, references, issues);
      break;
    case "semanticNode":
      validateReferenceId(reference.id, references.semanticNodeIds, "semantic node", label, references, issues);
      break;
    case "semanticIndex":
      validateReferenceId(reference.id, references.semanticIndexIds, "semantic index", label, references, issues);
      break;
    case "semanticSymbol":
      validateReferenceId(reference.id, references.semanticSymbolIds, "semantic symbol", label, references, issues);
      break;
    case "semanticOccurrence":
      validateReferenceId(reference.id, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
      break;
    case "semanticRelation":
      validateReferenceId(reference.id, references.semanticRelationIds, "semantic relation", label, references, issues);
      break;
    case "semanticFact":
      validateReferenceId(reference.id, references.semanticFactIds, "semantic fact", label, references, issues);
      break;
    case "sourceMap":
      validateReferenceId(reference.id, references.sourceMapIds, "source map", label, references, issues);
      break;
    case "sourceMapMapping":
      validateReferenceId(reference.id, references.sourceMapMappingIds, "source map mapping", label, references, issues);
      break;
    case "mergeCandidate":
      validateReferenceId(reference.id, references.mergeCandidateIds, "merge candidate", label, references, issues);
      break;
    case "proofContract":
      validateReferenceId(reference.id, references.proofContractIds, "proof contract", label, references, issues);
      break;
    case "proofObligation":
      validateReferenceId(reference.id, references.proofObligationIds, "proof obligation", label, references, issues);
      break;
    case "proofArtifact":
      validateReferenceId(reference.id, references.proofArtifactIds, "proof artifact", label, references, issues);
      break;
    case "proofAssumption":
      validateReferenceId(reference.id, references.proofAssumptionIds, "proof assumption", label, references, issues);
      break;
    case "paradigmRecord":
      validateReferenceId(reference.id, references.paradigmRecordIds, "paradigm record", label, references, issues);
      break;
    case "loss":
      validateReferenceId(reference.id, references.lossIds, "loss", label, references, issues);
      break;
    case "evidence":
      validateReferenceId(reference.id, references.evidenceIds, "evidence", label, references, issues);
      break;
    case "effect":
      validateReferenceId(reference.id, references.effectIds, "effect", label, references, issues);
      break;
    default:
      break;
  }
}

function validateUniversalAstGraph(graph, label, references, issues) {
  if (!graph) {
    return;
  }
  if (typeof graph !== "object") {
    issues.push(`${label} graph must be an object`);
    return;
  }
  const graphNodeIds = new Set();
  for (const node of graph.nodes ?? []) {
    const nodeLabel = `${label} graph node ${node?.id ?? "(unknown)"}`;
    if (!node?.id) {
      issues.push(`${label} has graph node without id`);
      continue;
    }
    if (graphNodeIds.has(node.id)) {
      issues.push(`${label} has duplicate graph node ${node.id}`);
    }
    graphNodeIds.add(node.id);
    validateReferenceId(node.nativeSourceId, references.nativeSourceIds, "native source", nodeLabel, references, issues);
    validateReferenceId(node.nativeAstId, references.nativeAstIds, "native AST", nodeLabel, references, issues);
    validateReferenceId(node.nativeAstNodeId, references.nativeAstNodeIds, "native AST node", nodeLabel, references, issues);
    validateReferenceId(node.semanticNodeId, references.semanticNodeIds, "semantic node", nodeLabel, references, issues);
    validateReferenceId(node.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", nodeLabel, references, issues);
    validateReferenceId(node.semanticOccurrenceId, references.semanticOccurrenceIds, "semantic occurrence", nodeLabel, references, issues);
    validateReferenceId(node.sourceMapId, references.sourceMapIds, "source map", nodeLabel, references, issues);
    validateReferenceId(node.sourceMapMappingId, references.sourceMapMappingIds, "source map mapping", nodeLabel, references, issues);
    validateReferenceIds(node.evidenceIds, references.evidenceIds, "evidence", nodeLabel, references, issues);
    for (const reference of node.references ?? []) {
      validateUniversalAstReference(reference, nodeLabel, references, issues);
    }
  }
  for (const edge of graph.edges ?? []) {
    const edgeLabel = `${label} graph edge ${edge?.id ?? "(unknown)"}`;
    if (!edge?.id) {
      issues.push(`${label} has graph edge without id`);
      continue;
    }
    if (!edge.sourceId || !graphNodeIds.has(edge.sourceId)) {
      issues.push(`${edgeLabel} references missing graph source ${edge.sourceId ?? "(missing)"}`);
    }
    if (!edge.targetId || !graphNodeIds.has(edge.targetId)) {
      issues.push(`${edgeLabel} references missing graph target ${edge.targetId ?? "(missing)"}`);
    }
    validateReferenceId(edge.semanticNodeId, references.semanticNodeIds, "semantic node", edgeLabel, references, issues);
    validateReferenceId(edge.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", edgeLabel, references, issues);
    validateReferenceIds(edge.evidenceIds, references.evidenceIds, "evidence", edgeLabel, references, issues);
    for (const reference of edge.references ?? []) {
      validateUniversalAstReference(reference, edgeLabel, references, issues);
    }
  }
  for (const entryId of graph.entryIds ?? []) {
    if (!graphNodeIds.has(entryId)) {
      issues.push(`${label} graph references missing entry node ${entryId}`);
    }
  }
  for (const exitId of graph.exitIds ?? []) {
    if (!graphNodeIds.has(exitId)) {
      issues.push(`${label} graph references missing exit node ${exitId}`);
    }
  }
}

function validateUniversalAstRuntime(runtime, label, references, issues) {
  if (!runtime) {
    return;
  }
  if (typeof runtime !== "object") {
    issues.push(`${label} runtime must be an object`);
    return;
  }
  validateReferenceId(runtime.semanticNodeId, references.semanticNodeIds, "semantic node", `${label} runtime`, references, issues);
  validateReferenceId(runtime.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", `${label} runtime`, references, issues);
  validateReferenceIds(runtime.semanticNodeIds, references.semanticNodeIds, "semantic node", `${label} runtime`, references, issues);
  validateReferenceIds(runtime.semanticSymbolIds, references.semanticSymbolIds, "semantic symbol", `${label} runtime`, references, issues);
  validateReferenceIds(runtime.effectIds, references.effectIds, "effect", `${label} runtime`, references, issues);
  validateReferenceIds(runtime.evidenceIds, references.evidenceIds, "evidence", `${label} runtime`, references, issues);
  for (const entrypoint of runtime.entrypoints ?? []) {
    const entryLabel = `${label} runtime entrypoint ${entrypoint?.id ?? entrypoint?.name ?? "(unknown)"}`;
    validateReferenceId(entrypoint.semanticNodeId, references.semanticNodeIds, "semantic node", entryLabel, references, issues);
    validateReferenceId(entrypoint.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", entryLabel, references, issues);
    validateReferenceIds(entrypoint.effectIds, references.effectIds, "effect", entryLabel, references, issues);
    validateReferenceIds(entrypoint.evidenceIds, references.evidenceIds, "evidence", entryLabel, references, issues);
  }
}

function validateSourceMapMappingPrecision(mapping, sourceMap, label, issues) {
  if (!mapping.precision) {
    return;
  }

  if (
    mapping.preservation &&
    SourcePreservationLevels.includes(mapping.preservation) &&
    mapping.preservation === "blocked" &&
    (mapping.lossIds ?? []).length === 0
  ) {
    issues.push(`${label} has blocked preservation without a linked loss`);
  }

  switch (mapping.precision) {
    case "exact": {
      if (!mapping.sourceSpan || !hasExactSpanPosition(mapping.sourceSpan, sourceMap.sourcePath)) {
        issues.push(`${label} exact precision requires a source span with path/sourceId and line/column or offset coordinates`);
      }
      if (!mapping.generatedSpan || !hasExactSpanPosition(mapping.generatedSpan, sourceMap.targetPath)) {
        issues.push(`${label} exact precision requires a generated span with path/sourceId and line/column or offset coordinates`);
      }
      break;
    }
    case "declaration": {
      if (!mapping.semanticNodeId && !mapping.semanticSymbolId && !mapping.semanticOccurrenceId && !mapping.nativeAstNodeId) {
        issues.push(`${label} declaration precision requires a semantic, symbol, occurrence, or native AST declaration anchor`);
      }
      if (!hasAnySpanPosition(mapping.sourceSpan) && !hasAnySpanPosition(mapping.generatedSpan)) {
        issues.push(`${label} declaration precision requires a source or generated span`);
      }
      break;
    }
    case "line": {
      if (!hasLineSpan(mapping.sourceSpan) && !hasLineSpan(mapping.generatedSpan)) {
        issues.push(`${label} line precision requires a line span`);
      }
      break;
    }
    case "estimated":
    case "unknown": {
      if ((mapping.lossIds ?? []).length === 0 && (mapping.evidenceIds ?? []).length === 0) {
        issues.push(`${label} ${mapping.precision} precision requires linked loss or evidence`);
      }
      break;
    }
    default:
      break;
  }
}

function hasExactSpanPosition(span, fallbackPath) {
  return Boolean((span?.path || span?.sourceId || fallbackPath) && (
    typeof span.start === "number" ||
    (typeof span.startLine === "number" && typeof span.startColumn === "number")
  ));
}

function hasAnySpanPosition(span) {
  return Boolean(span && (
    typeof span.start === "number" ||
    typeof span.end === "number" ||
    typeof span.startLine === "number" ||
    typeof span.endLine === "number"
  ));
}

function hasLineSpan(span) {
  return Boolean(span && (typeof span.startLine === "number" || typeof span.endLine === "number"));
}

function collectLinkedSourcePreservationLosses(losses, input) {
  const lossIds = new Set(input.lossIds ?? []);
  return uniqueById(losses.filter((loss) => {
    if (!loss?.id) {
      return false;
    }
    if (lossIds.has(loss.id)) {
      return true;
    }
    if (input.sourceMapId && loss.sourceMapId === input.sourceMapId) {
      return !input.mappingId || !loss.sourceMapMappingId || loss.sourceMapMappingId === input.mappingId;
    }
    return false;
  }));
}

function collectLinkedSourcePreservationEvidence(evidence, input) {
  const evidenceIds = new Set(input.evidenceIds ?? []);
  return uniqueEvidence(evidence.filter((record) => record?.id && evidenceIds.has(record.id)));
}

function inferSourcePreservationLevel(mapping, losses) {
  if (!mapping) {
    return "blocked";
  }
  if (losses.some((record) => record.severity === "error")) {
    return "blocked";
  }
  if (mapping.preservation && SourcePreservationLevels.includes(mapping.preservation)) {
    return mapping.preservation;
  }
  if (mapping.precision === "exact") {
    return "exact";
  }
  if (mapping.precision === "declaration") {
    return "declaration";
  }
  if (mapping.precision === "estimated" || mapping.precision === "line" || mapping.precision === "unknown") {
    return "estimated";
  }
  if (losses.length > 0) {
    return "estimated";
  }
  return "estimated";
}

function explainSourcePreservationReasons(input) {
  if (!input.mapping) {
    return ["No source map mapping is available for this preservation record."];
  }
  if (input.level === "blocked") {
    const lossIds = input.losses.map((record) => record.id);
    return lossIds.length > 0
      ? [`Preservation is blocked by loss record(s): ${lossIds.join(", ")}`]
      : ["Preservation is blocked because no precise source mapping is available."];
  }
  if (input.level === "exact") {
    return ["Source and generated positions are preserved with exact mapping precision."];
  }
  if (input.level === "declaration") {
    return ["Source preservation is anchored at declaration level for semantic merge review."];
  }
  const lossIds = input.losses.map((record) => record.id);
  const evidenceIds = input.evidence.map((record) => record.id);
  const details = [
    lossIds.length > 0 ? `losses: ${lossIds.join(", ")}` : "",
    evidenceIds.length > 0 ? `evidence: ${evidenceIds.join(", ")}` : ""
  ].filter(Boolean);
  return details.length > 0
    ? [`Source preservation is estimated and linked to ${details.join("; ")}.`]
    : ["Source preservation is estimated and should be reviewed before relying on span-level merge keys."];
}

function validateSourceSpan(span, label, issues) {
  if (!span) {
    return;
  }
  if (typeof span.start === "number" && typeof span.end === "number" && span.end < span.start) {
    issues.push(`${label} ends before it starts`);
  }
  if (typeof span.startLine === "number" && typeof span.endLine === "number") {
    if (span.endLine < span.startLine) {
      issues.push(`${label} end line is before start line`);
      return;
    }
    if (
      span.endLine === span.startLine &&
      typeof span.startColumn === "number" &&
      typeof span.endColumn === "number" &&
      span.endColumn < span.startColumn
    ) {
      issues.push(`${label} end column is before start column`);
    }
  }
}

function collectUniqueIds(records, label, issues) {
  const ids = new Set();
  for (const record of records) {
    if (!record?.id) {
      issues.push(`Semantic index ${label} is missing id`);
      continue;
    }
    if (ids.has(record.id)) {
      issues.push(`Semantic index has duplicate ${label} id ${record.id}`);
    }
    ids.add(record.id);
  }
  return ids;
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return unique(left.filter((item) => rightSet.has(item)));
}

function unique(items) {
  return [...new Set(items)];
}

function ordinalCompare(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
