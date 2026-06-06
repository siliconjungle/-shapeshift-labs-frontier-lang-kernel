import { ParadigmSemanticsRecordGroups } from "./constants.js";
import { collectParadigmEvidenceIds, collectProofEvidenceIds } from "./evidence.js";
import { collectParadigmRecordEntries } from "./paradigm-records.js";
import { unique } from "./shared.js";
import { createUniversalAstLayer } from "./universal-ast-layer.js";

export function createDefaultUniversalAstLayers(input) {
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

  if (input.semanticOperations?.operations?.length > 0) {
    const operations = input.semanticOperations.operations;
    layers.semanticOperations = createUniversalAstLayer({
      id: "layer:semanticOperations",
      layer: "semanticOperations",
      semanticOperationIds: operations.map((operation) => operation.id),
      semanticNodeIds: unique(operations.flatMap((operation) => operation.semanticNodeIds)),
      nativeAstNodeIds: unique(operations.flatMap((operation) => operation.nativeAstNodeIds)),
      sourceMapIds: unique(operations.flatMap((operation) => operation.sourceMapIds)),
      sourceMapMappingIds: unique(operations.flatMap((operation) => operation.sourceMapMappingIds)),
      effectIds: unique(operations.flatMap((operation) => operation.effectIds)),
      lossIds: unique(operations.flatMap((operation) => operation.lossIds)),
      evidenceIds: unique(operations.flatMap((operation) => operation.evidenceIds)),
      records: [{ semanticOperationSetId: input.semanticOperations.id, ...input.semanticOperations.summary }]
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

export function normalizeUniversalAstLayers(input, defaults = {}) {
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
