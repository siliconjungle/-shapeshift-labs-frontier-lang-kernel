import type { EvidenceRecord } from "./evidence.js";
import type { CompileTarget, JsonObject, SemanticId, SourceSpan } from "./base.js";
import type { FrontierLangDocument, NativeSourceNode } from "./document.js";
import type { FrontierParadigmSemanticsLayer } from "./paradigm-semantics.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexRecord } from "./source-records.js";
import type { SemanticMergeCandidateRecord } from "./merge-candidates.js";
import type { SourceMapPrecision, SourcePreservationLevel } from "./constants.js";

export interface SourceMapGeneratedSpan extends SourceSpan {
  readonly target?: CompileTarget;
  readonly targetPath?: string;
  readonly targetHash?: string;
  readonly generatedName?: string;
}

export interface SourceMapMappingRecord {
  readonly id: string;
  readonly semanticNodeId?: SemanticId;
  readonly nativeSourceId?: SemanticId;
  readonly nativeAstNodeId?: string;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly mergeCandidateId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly generatedSpan?: SourceMapGeneratedSpan;
  readonly target?: CompileTarget;
  readonly generatedName?: string;
  readonly evidenceIds?: readonly string[];
  readonly lossIds?: readonly string[];
  readonly precision: SourceMapPrecision;
  readonly preservation?: SourcePreservationLevel;
  readonly metadata?: JsonObject;
}

export interface SourceMapRecord {
  readonly kind: "frontier.lang.sourceMap";
  readonly version: 1;
  readonly id: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly target?: CompileTarget;
  readonly targetPath?: string;
  readonly targetHash?: string;
  readonly semanticIndexId?: string;
  readonly universalAstId?: string;
  readonly nativeAstId?: string;
  readonly nativeSourceId?: SemanticId;
  readonly mappings: readonly SourceMapMappingRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export interface SourcePreservationRecord {
  readonly kind: "frontier.lang.sourcePreservation";
  readonly version: 1;
  readonly id: string;
  readonly level: SourcePreservationLevel;
  readonly precision?: SourceMapPrecision;
  readonly sourceMapId?: string;
  readonly sourceMapMappingId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly nativeSourceId?: SemanticId;
  readonly nativeAstNodeId?: string;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly generatedSpan?: SourceMapGeneratedSpan;
  readonly lossIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly reasons: readonly string[];
  readonly metadata?: JsonObject;
}

export declare function createSourceMapRecord(input: Omit<SourceMapRecord, "kind" | "version" | "mappings"> & {
  readonly mappings?: readonly SourceMapMappingRecord[];
}): SourceMapRecord;

export declare function createSourcePreservationRecord(input: Omit<SourcePreservationRecord, "kind" | "version" | "lossIds" | "evidenceIds" | "reasons"> & {
  readonly lossIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly reasons?: readonly string[];
}): SourcePreservationRecord;

export declare function explainSourcePreservation(input: {
  readonly id?: string;
  readonly level?: SourcePreservationLevel;
  readonly precision?: SourceMapPrecision;
  readonly sourceMap?: SourceMapRecord;
  readonly sourceMapId?: string;
  readonly sourceMapMappingId?: string;
  readonly mapping?: SourceMapMappingRecord;
  readonly mappingId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly nativeSourceId?: SemanticId;
  readonly nativeAstNodeId?: string;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly generatedSpan?: SourceMapGeneratedSpan;
  readonly losses?: readonly NativeAstLossRecord[];
  readonly lossIds?: readonly string[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly evidenceIds?: readonly string[];
  readonly reasons?: readonly string[];
  readonly metadata?: JsonObject;
}): SourcePreservationRecord;

export declare function validateSourceMapRecord(sourceMap: SourceMapRecord, context?: {
  readonly document?: FrontierLangDocument;
  readonly nativeSources?: readonly NativeSourceNode[];
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly paradigmSemantics?: FrontierParadigmSemanticsLayer;
}): readonly string[];
