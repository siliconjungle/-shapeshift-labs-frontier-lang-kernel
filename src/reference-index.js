import { collectParadigmRecords } from "./paradigm-records.js";
import { collectDocumentSemanticIds } from "./document-semantic-ids.js";
import { uniqueById } from "./shared.js";
import { collectUniversalAstLayerRecords } from "./universal-ast-records.js";

export function createUniversalAstReferenceIndex(context = {}) {
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
  const semanticOperations = context.semanticOperations?.operations ?? context.semanticOperations ?? envelope?.semanticOperations?.operations ?? [];
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
    semanticNodeIds: collectDocumentSemanticIds(document),
    semanticIndexIds: new Set([semanticIndex?.id].filter(Boolean)),
    semanticSymbolIds: new Set((semanticIndex?.symbols ?? []).map((symbol) => symbol.id)),
    semanticOccurrenceIds: new Set((semanticIndex?.occurrences ?? []).map((occurrence) => occurrence.id)),
    semanticRelationIds: new Set((semanticIndex?.relations ?? []).map((relation) => relation.id)),
    semanticFactIds: new Set((semanticIndex?.facts ?? []).map((fact) => fact.id)),
    sourceMapIds: new Set(sourceMaps.map((sourceMap) => sourceMap.id).filter(Boolean)),
    sourceMapMappingIds: new Set(sourceMapMappingIds),
    mergeCandidateIds: new Set(mergeCandidates.map((candidate) => candidate.id).filter(Boolean)),
    semanticOperationIds: new Set(semanticOperations.map((operation) => operation.id).filter(Boolean)),
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

export function collectEffectReferenceIds(document) {
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

export function validateReferenceIds(ids, targetIds, targetLabel, label, references, issues) {
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

export function validateReferenceId(id, targetIds, targetLabel, label, references, issues) {
  if (!id) {
    return;
  }
  if ((references.strict || targetIds.size > 0) && !targetIds.has(id)) {
    issues.push(`${label} references missing ${targetLabel} ${id}`);
  }
}

export function inferReferenceSubjectKind(id, references) {
  if (references.semanticNodeIds.has(id)) return "semanticNode";
  if (references.semanticSymbolIds.has(id)) return "semanticSymbol";
  if (references.semanticOccurrenceIds.has(id)) return "semanticOccurrence";
  if (references.nativeSourceIds.has(id)) return "nativeSource";
  if (references.nativeAstIds.has(id)) return "nativeAst";
  if (references.nativeAstNodeIds.has(id)) return "nativeAstNode";
  if (references.sourceMapIds.has(id)) return "sourceMap";
  if (references.sourceMapMappingIds.has(id)) return "sourceMapMapping";
  if (references.semanticOperationIds.has(id)) return "semanticOperation";
  if (references.effectIds.has(id)) return "effect";
  return undefined;
}

export function validateUniversalAstReference(reference, label, references, issues) {
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
    case "semanticOperation":
      validateReferenceId(reference.id, references.semanticOperationIds, "semantic operation", label, references, issues);
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

export function validateUniversalAstGraph(graph, label, references, issues) {
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

export function validateUniversalAstRuntime(runtime, label, references, issues) {
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
