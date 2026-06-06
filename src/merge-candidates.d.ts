import type { EvidenceRecord } from "./evidence.js";
import type { FrontierSourceLanguage, JsonObject, NodeKind, SemanticId, SourceSpan } from "./base.js";
import type { FrontierLangDocument } from "./document.js";
import type { FrontierUniversalAstEnvelope } from "./universal-ast.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexOccurrenceRole, SemanticIndexRecord, SemanticIndexSymbolKind } from "./source-records.js";
import type { SemanticPatchBundle } from "./patching.js";
import type { SourceMapRecord } from "./source-maps.js";

export type SemanticMergeReadiness = "ready" | "ready-with-losses" | "needs-review" | "blocked";

export interface SemanticMergeTouchedSymbol {
  readonly id: string;
  readonly name?: string;
  readonly kind?: SemanticIndexSymbolKind;
  readonly role?: SemanticIndexOccurrenceRole;
  readonly semanticNodeId?: SemanticId;
  readonly nativeAstNodeId?: string;
  readonly span?: SourceSpan;
  readonly conflictKey: string;
  readonly metadata?: JsonObject;
}

export interface SemanticMergeTouchedNode {
  readonly id: SemanticId;
  readonly kind?: NodeKind | string;
  readonly name?: string;
  readonly conflictKey: string;
  readonly metadata?: JsonObject;
}

export interface SemanticMergeNativeSpan {
  readonly id: string;
  readonly sourceId?: string;
  readonly path?: string;
  readonly language?: FrontierSourceLanguage;
  readonly nativeAstNodeId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly symbolId?: string;
  readonly span?: SourceSpan;
  readonly conflictKey: string;
  readonly metadata?: JsonObject;
}

export interface SemanticMergeCandidateRecord {
  readonly kind: "frontier.lang.semanticMergeCandidate";
  readonly version: 1;
  readonly id: string;
  readonly importResultId?: string;
  readonly patchId?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly baseHash?: string;
  readonly targetHash?: string;
  readonly touchedSymbols: readonly SemanticMergeTouchedSymbol[];
  readonly touchedSemanticNodes: readonly SemanticMergeTouchedNode[];
  readonly nativeSpans: readonly SemanticMergeNativeSpan[];
  readonly conflictKeys: readonly string[];
  readonly readiness: SemanticMergeReadiness;
  readonly reasons: readonly string[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export interface LanguageImportResult {
  readonly kind: "frontier.lang.importResult";
  readonly version: 1;
  readonly id: string;
  readonly language: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly document: FrontierLangDocument;
  readonly patch?: SemanticPatchBundle;
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly universalAst?: FrontierUniversalAstEnvelope;
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly losses: readonly NativeAstLossRecord[];
  readonly evidence: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export interface NativeAstMergeCandidateOptions {
  readonly id?: string;
  readonly document?: FrontierLangDocument;
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly readiness?: SemanticMergeReadiness;
  readonly reasons?: readonly string[];
  readonly maxSubtreeKeys?: number;
  readonly metadata?: JsonObject;
}

export declare function createImportResult(input: Omit<LanguageImportResult, "kind" | "version" | "losses" | "evidence" | "mergeCandidates"> & {
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly sourceMaps?: readonly SourceMapRecord[];
}): LanguageImportResult;

export declare function createSemanticMergeCandidateRecord(input: Omit<SemanticMergeCandidateRecord, "kind" | "version" | "touchedSymbols" | "touchedSemanticNodes" | "nativeSpans" | "conflictKeys" | "readiness" | "reasons"> & {
  readonly touchedSymbols?: readonly SemanticMergeTouchedSymbol[];
  readonly touchedSemanticNodes?: readonly SemanticMergeTouchedNode[];
  readonly nativeSpans?: readonly SemanticMergeNativeSpan[];
  readonly conflictKeys?: readonly string[];
  readonly readiness?: SemanticMergeReadiness;
  readonly reasons?: readonly string[];
}): SemanticMergeCandidateRecord;

export declare function createSemanticMergeCandidateFromImport(input: {
  readonly importResult: LanguageImportResult;
  readonly id?: string;
  readonly patch?: SemanticPatchBundle;
  readonly document?: FrontierLangDocument;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly nativeAst?: NativeAstRecord;
  readonly sourcePath?: string;
  readonly language?: FrontierSourceLanguage;
  readonly readiness?: SemanticMergeReadiness;
  readonly reasons?: readonly string[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}): SemanticMergeCandidateRecord;

export declare function createNativeAstMergeCandidate(input: NativeAstMergeCandidateOptions): SemanticMergeCandidateRecord;
