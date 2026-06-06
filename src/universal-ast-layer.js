import { createUniversalAstReferenceIndex, validateReferenceId, validateReferenceIds, validateUniversalAstGraph, validateUniversalAstReference, validateUniversalAstRuntime } from "./reference-index.js";

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
  validateReferenceIds(layer.semanticOperationIds, references.semanticOperationIds, "semantic operation", label, references, issues);
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
    validateReferenceId(artifact.semanticOperationId, references.semanticOperationIds, "semantic operation", artifactLabel, references, issues);
    validateReferenceId(artifact.sourceMapId, references.sourceMapIds, "source map", artifactLabel, references, issues);
    validateReferenceId(artifact.evidenceId, references.evidenceIds, "evidence", artifactLabel, references, issues);
  }

  validateUniversalAstGraph(layer.graph, label, references, issues);
  validateUniversalAstRuntime(layer.runtime, label, references, issues);

  return issues;
}
