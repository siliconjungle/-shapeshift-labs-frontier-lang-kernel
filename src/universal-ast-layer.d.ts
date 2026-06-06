import type { FrontierSourceLanguage, JsonObject, JsonValue, SemanticId } from "./base.js";
import type { CompileTarget } from "./base.js";
import type { EvidenceRecord } from "./evidence.js";
import type { FrontierLangDocument, NativeSourceNode } from "./document.js";
import type { FrontierParadigmSemanticsLayer } from "./paradigm-semantics.js";
import type { FrontierUniversalAstEnvelope } from "./universal-ast.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexRecord } from "./source-records.js";
import type { SemanticMergeCandidateRecord } from "./merge-candidates.js";
import type { SourceMapRecord } from "./source-maps.js";
import type { UniversalAstLayerName, UniversalAstReferenceKind } from "./constants.js";

export interface UniversalAstLayerReference {
  readonly kind: UniversalAstReferenceKind;
  readonly id: string;
  readonly layer?: UniversalAstLayerName;
  readonly metadata?: JsonObject;
}

export interface UniversalAstLayerArtifact {
  readonly id: string;
  readonly kind:
    | "sourceText"
    | "tokenStream"
    | "trivia"
    | "cst"
    | "semanticIndex"
    | "effectGraph"
    | "controlFlowGraph"
    | "dataFlowGraph"
    | "runtimeModel"
    | "projection"
    | "mergeEvidence"
    | string;
  readonly nativeSourceId?: SemanticId;
  readonly nativeAstId?: string;
  readonly nativeAstNodeId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly semanticSymbolId?: string;
  readonly sourceMapId?: string;
  readonly evidenceId?: string;
  readonly path?: string;
  readonly hash?: string;
  readonly text?: string;
  readonly data?: JsonValue;
  readonly metadata?: JsonObject;
}

export interface UniversalAstLayerGraphNode {
  readonly id: string;
  readonly kind?: string;
  readonly nativeSourceId?: SemanticId;
  readonly nativeAstId?: string;
  readonly nativeAstNodeId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly sourceMapId?: string;
  readonly sourceMapMappingId?: string;
  readonly evidenceIds?: readonly string[];
  readonly references?: readonly UniversalAstLayerReference[];
  readonly metadata?: JsonObject;
}

export interface UniversalAstLayerGraphEdge {
  readonly id: string;
  readonly kind?: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly semanticNodeId?: SemanticId;
  readonly semanticSymbolId?: string;
  readonly evidenceIds?: readonly string[];
  readonly references?: readonly UniversalAstLayerReference[];
  readonly metadata?: JsonObject;
}

export interface UniversalAstLayerGraph {
  readonly nodes?: readonly UniversalAstLayerGraphNode[];
  readonly edges?: readonly UniversalAstLayerGraphEdge[];
  readonly entryIds?: readonly string[];
  readonly exitIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface UniversalAstRuntimeEntrypoint {
  readonly id?: string;
  readonly name?: string;
  readonly semanticNodeId?: SemanticId;
  readonly semanticSymbolId?: string;
  readonly effectIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface UniversalAstRuntimeModel {
  readonly id?: string;
  readonly language?: FrontierSourceLanguage;
  readonly target?: CompileTarget;
  readonly semanticNodeId?: SemanticId;
  readonly semanticSymbolId?: string;
  readonly semanticNodeIds?: readonly SemanticId[];
  readonly semanticSymbolIds?: readonly string[];
  readonly effectIds?: readonly string[];
  readonly entrypoints?: readonly UniversalAstRuntimeEntrypoint[];
  readonly resources?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface UniversalAstLayerRecord {
  readonly kind: "frontier.lang.universalAstLayer";
  readonly version: 1;
  readonly id: string;
  readonly layer: UniversalAstLayerName;
  readonly nativeSourceIds?: readonly SemanticId[];
  readonly nativeAstIds?: readonly string[];
  readonly nativeAstNodeIds?: readonly string[];
  readonly semanticNodeIds?: readonly SemanticId[];
  readonly semanticIndexId?: string;
  readonly semanticSymbolIds?: readonly string[];
  readonly semanticOccurrenceIds?: readonly string[];
  readonly semanticRelationIds?: readonly string[];
  readonly semanticFactIds?: readonly string[];
  readonly sourceMapIds?: readonly string[];
  readonly sourceMapMappingIds?: readonly string[];
  readonly mergeCandidateIds?: readonly string[];
  readonly paradigmRecordIds?: readonly string[];
  readonly lossIds?: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly effectIds?: readonly string[];
  readonly references: readonly UniversalAstLayerReference[];
  readonly records: readonly JsonObject[];
  readonly artifacts?: readonly UniversalAstLayerArtifact[];
  readonly graph?: UniversalAstLayerGraph;
  readonly runtime?: UniversalAstRuntimeModel;
  readonly metadata?: JsonObject;
}

export type UniversalAstLayerMap = Readonly<Record<string, UniversalAstLayerRecord>>;

export declare function createUniversalAstLayer(input: Omit<UniversalAstLayerRecord, "kind" | "version" | "id" | "references" | "records" | "evidenceIds"> & {
  readonly id?: string;
  readonly references?: readonly UniversalAstLayerReference[];
  readonly records?: readonly JsonObject[];
  readonly evidenceIds?: readonly string[];
}): UniversalAstLayerRecord;

export declare function validateUniversalAstLayer(layer: UniversalAstLayerRecord, context?: {
  readonly envelope?: FrontierUniversalAstEnvelope;
  readonly document?: FrontierLangDocument;
  readonly nativeSources?: readonly NativeSourceNode[];
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly paradigmSemantics?: FrontierParadigmSemanticsLayer;
  readonly layers?: UniversalAstLayerMap | readonly UniversalAstLayerRecord[];
  readonly strict?: boolean;
}): readonly string[];
