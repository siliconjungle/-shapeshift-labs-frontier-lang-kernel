import type { EvidenceRecord } from "./evidence.js";
import type { JsonObject } from "./base.js";
import type { FrontierLangDocument, NativeSourceNode } from "./document.js";
import type { FrontierParadigmSemanticsLayer, ParadigmSemanticsLayerInput } from "./paradigm-semantics.js";
import type { FrontierProofSpecLayer, ProofSpecLayerInput } from "./proof-spec.js";
import type { NativeAstLossRecord, SemanticIndexRecord } from "./source-records.js";
import type { SemanticMergeCandidateRecord } from "./merge-candidates.js";
import type { SourceMapRecord } from "./source-maps.js";
import type { UniversalAstLayerMap, UniversalAstLayerRecord } from "./universal-ast-layer.js";

export interface FrontierUniversalAstEnvelope {
  readonly kind: "frontier.lang.universalAst";
  readonly version: 1;
  readonly id: string;
  readonly schema: "frontier.lang.semantic.v1" | string;
  readonly document: FrontierLangDocument;
  readonly nativeSources: readonly NativeSourceNode[];
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourceMaps: readonly SourceMapRecord[];
  readonly losses: readonly NativeAstLossRecord[];
  readonly evidence: readonly EvidenceRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly proof?: FrontierProofSpecLayer;
  readonly paradigmSemantics?: FrontierParadigmSemanticsLayer;
  readonly layers?: UniversalAstLayerMap;
  readonly metadata?: JsonObject;
}

export declare function createUniversalAstEnvelope(input: Omit<FrontierUniversalAstEnvelope, "kind" | "version" | "schema" | "nativeSources" | "sourceMaps" | "losses" | "evidence" | "mergeCandidates" | "proof" | "paradigmSemantics" | "layers"> & {
  readonly schema?: FrontierUniversalAstEnvelope["schema"];
  readonly nativeSources?: readonly NativeSourceNode[];
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly proof?: ProofSpecLayerInput | FrontierProofSpecLayer;
  readonly paradigmSemantics?: ParadigmSemanticsLayerInput | FrontierParadigmSemanticsLayer;
  readonly layers?: UniversalAstLayerMap | readonly UniversalAstLayerRecord[];
}): FrontierUniversalAstEnvelope;

export declare function validateUniversalAstEnvelope(envelope: FrontierUniversalAstEnvelope): readonly string[];
