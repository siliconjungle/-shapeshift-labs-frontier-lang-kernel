import type { EvidenceRecord } from "./evidence.js";
import type { JsonObject } from "./base.js";
import type { SemanticMergeCandidateRecord } from "./merge-candidates.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexRecord } from "./source-records.js";
import type { SourceMapGeneratedSpan, SourceMapMappingRecord, SourceMapRecord } from "./source-maps.js";

export type SemanticMergeAdmissionClassification = "safe" | "safe-with-losses" | "review-required" | "blocked";

export type SemanticMergeConflictKeyKind =
  | "symbol"
  | "semantic-node"
  | "region"
  | "native-span"
  | "source-subtree"
  | "effect"
  | "generated-output"
  | "signature"
  | "custom";

export interface SemanticMergeGeneratedOutputConflictKeyContext {
  readonly sourceMap?: SourceMapRecord;
  readonly mapping?: SourceMapMappingRecord;
  readonly stableId?: string;
}

export interface SemanticMergeAdmissionConflictKeyOptions {
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourcePath?: string;
  readonly regions?: readonly (string | { readonly id?: string })[];
  readonly effects?: readonly string[];
  readonly generatedSpans?: readonly SourceMapGeneratedSpan[];
  readonly extraConflictKeys?: readonly string[];
  readonly includeAllGeneratedMappings?: boolean;
  readonly maxSubtreeKeys?: number;
}

export interface SemanticMergeAdmissionOptions extends SemanticMergeAdmissionConflictKeyOptions {
  readonly id?: string;
  readonly evidence?: readonly EvidenceRecord[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly requiredConflictKeyKinds?: readonly SemanticMergeConflictKeyKind[];
  readonly opaque?: boolean;
  readonly metadata?: JsonObject;
}

export interface SemanticMergeAdmissionInput extends SemanticMergeAdmissionOptions {
  readonly candidate: SemanticMergeCandidateRecord;
}

export interface SemanticMergeAdmissionRecord {
  readonly kind: "frontier.lang.semanticMergeAdmission";
  readonly version: 1;
  readonly id: string;
  readonly candidateId?: string;
  readonly classification: SemanticMergeAdmissionClassification;
  readonly autoMergeable: boolean;
  readonly conflictKeys: readonly string[];
  readonly conflictKeyKinds: readonly SemanticMergeConflictKeyKind[];
  readonly reasons: readonly string[];
  readonly evidence: readonly EvidenceRecord[];
  readonly losses: readonly NativeAstLossRecord[];
  readonly metadata: JsonObject;
}

export declare const SEMANTIC_MERGE_ADMISSION_CLASSIFICATIONS: readonly SemanticMergeAdmissionClassification[];
export declare const SEMANTIC_MERGE_ADMISSION_CONFLICT_KEY_KINDS: readonly SemanticMergeConflictKeyKind[];
export declare const SEMANTIC_MERGE_DYNAMIC_EFFECTS: readonly string[];

export declare function semanticMergeGeneratedOutputConflictKey(
  generatedSpan: SourceMapGeneratedSpan,
  context?: SemanticMergeGeneratedOutputConflictKeyContext
): string;

export declare function collectSemanticMergeAdmissionConflictKeys(
  candidate: SemanticMergeCandidateRecord,
  options?: SemanticMergeAdmissionConflictKeyOptions
): readonly string[];

export declare function semanticMergeConflictKeyKind(conflictKey: string): SemanticMergeConflictKeyKind;

export declare function collectSemanticMergeConflictKeyKinds(conflictKeys: readonly string[]): readonly SemanticMergeConflictKeyKind[];

export declare function classifySemanticMergeCandidate(
  input: SemanticMergeCandidateRecord | SemanticMergeAdmissionInput,
  options?: SemanticMergeAdmissionOptions
): SemanticMergeAdmissionRecord;

export declare function createSemanticMergeAdmissionRecord(
  input: SemanticMergeCandidateRecord | SemanticMergeAdmissionInput,
  options?: SemanticMergeAdmissionOptions
): SemanticMergeAdmissionRecord;
