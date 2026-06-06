import { createParadigmSemanticsLayer, validateParadigmSemanticsLayer } from "./paradigm-semantics.js";
import { createProofSpecLayer, validateProofSpecLayer } from "./proof-spec.js";
import { validateDocument } from "./document-validation.js";
import { validateSemanticIndexRecord } from "./source-records.js";
import { validateSourceMapRecord } from "./source-maps.js";
import { createDefaultUniversalAstLayers, normalizeUniversalAstLayers } from "./universal-ast-defaults.js";
import { validateUniversalAstLayer } from "./universal-ast-layer.js";
import { collectUniversalAstLayerRecords } from "./universal-ast-records.js";

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
