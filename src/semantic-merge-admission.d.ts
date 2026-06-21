import type { EvidenceRecord } from "./evidence.js";
import type {
  JsTsConflictReasonCode,
  JsTsConflictSidecarInput,
  JsTsConflictSidecarRecord
} from "./js-ts-merge-contracts.js";
import type { JsonObject, SourceSpan } from "./base.js";
import type { JsTsSafeMergeApplyInput, JsTsSafeMergeApplyRecord } from "./js-ts-safe-merge.js";
import type { SemanticMergeCandidateRecord, SemanticMergeReadiness } from "./merge-candidates.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexRecord } from "./source-records.js";
import type { SourceMapGeneratedSpan, SourceMapMappingRecord, SourceMapRecord, SourcePreservationRecord } from "./source-maps.js";

export type SemanticMergeAdmissionClassification = "safe" | "safe-with-losses" | "review-required" | "blocked";

export type SemanticMergeConflictKeyKind =
  | "symbol"
  | "semantic-node"
  | "region"
  | "native-span"
  | "source-preservation"
  | "source-subtree"
  | "effect"
  | "generated-output"
  | "signature"
  | "custom";

export type JsTsSemanticMergeSafeContractKind = "import" | "declaration" | "member";

export type SemanticMergeContractStatus =
  | "safe"
  | "unsafe"
  | "review-required"
  | "needs-review"
  | "blocked"
  | "failed"
  | "unknown"
  | string;

export type SemanticMergeConflictSeverity = "info" | "warning" | "error";

export type SemanticMergeConflictReasonCode =
  | "semantic-merge.no-candidate"
  | "semantic-merge.failed-evidence"
  | "semantic-merge.readiness-blocked"
  | "semantic-merge.blocking-loss"
  | "semantic-merge.missing-conflict-keys"
  | "semantic-merge.missing-required-kind"
  | "semantic-merge.opaque-or-dynamic"
  | "semantic-merge.dynamic-effect"
  | "semantic-merge.effect-boundary"
  | "semantic-merge.unknown-evidence"
  | "semantic-merge.readiness-review"
  | "semantic-merge.non-blocking-loss"
  | "semantic-merge.competing-candidate"
  | "semantic-merge.apply-gate-blocked-evidence"
  | "semantic-merge.apply-gate-stale"
  | "semantic-merge.apply-gate-no-op"
  | "semantic-merge.apply-gate-review"
  | "semantic-merge.external-conflict"
  | JsTsConflictReasonCode
  | (string & {});

export interface SemanticMergeConflictCandidateRef {
  readonly id: string;
  readonly readiness?: SemanticMergeReadiness;
  readonly sourcePath?: string;
  readonly conflictKeys: readonly string[];
}

export interface SemanticMergeConflictRemediationHint {
  readonly action: string;
  readonly target?: string;
  readonly targetIds: readonly string[];
  readonly detail?: string;
  readonly metadata?: JsonObject;
}

export interface SemanticMergeConflictSidecarInput {
  readonly id?: string;
  readonly code: SemanticMergeConflictReasonCode;
  readonly severity: SemanticMergeConflictSeverity;
  readonly affectedContractIds?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly sourceSpans?: readonly SourceSpan[];
  readonly competingCandidates?: readonly SemanticMergeConflictCandidateRef[];
  readonly reason: string;
  readonly remediationHints?: readonly SemanticMergeConflictRemediationHint[];
  readonly metadata?: JsonObject;
}

export interface SemanticMergeConflictSidecarRecord {
  readonly kind: "frontier.lang.semanticMergeConflict";
  readonly version: 1;
  readonly id: string;
  readonly code: SemanticMergeConflictReasonCode;
  readonly severity: SemanticMergeConflictSeverity;
  readonly affectedContractIds: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly sourceSpans: readonly SourceSpan[];
  readonly competingCandidates: readonly SemanticMergeConflictCandidateRef[];
  readonly reason: string;
  readonly remediationHints: readonly SemanticMergeConflictRemediationHint[];
  readonly metadata?: JsonObject;
}

export interface SemanticMergeGeneratedOutputConflictKeyContext {
  readonly sourceMap?: SourceMapRecord;
  readonly mapping?: SourceMapMappingRecord;
  readonly stableId?: string;
}

export interface SemanticMergeSourcePreservationConflictKeyContext {
  readonly sourceMap?: SourceMapRecord;
  readonly mapping?: SourceMapMappingRecord;
  readonly stableId?: string;
}

export interface SemanticMergeContractRecord {
  readonly id?: string;
  readonly kind?: JsTsSemanticMergeSafeContractKind | string;
  readonly case?: JsTsSemanticMergeSafeContractKind | string;
  readonly contractKind?: JsTsSemanticMergeSafeContractKind | string;
  readonly operationKind?: JsTsSemanticMergeSafeContractKind | string;
  readonly language?: string;
  readonly safe?: boolean;
  readonly autoMerge?: boolean;
  readonly autoMergeable?: boolean;
  readonly status?: SemanticMergeContractStatus;
  readonly readiness?: SemanticMergeReadiness | SemanticMergeContractStatus;
  readonly classification?: SemanticMergeAdmissionClassification | SemanticMergeContractStatus;
  readonly evidenceId?: string;
  readonly evidenceIds?: readonly string[];
  readonly requiredEvidenceIds?: readonly string[];
  readonly requiredConflictKeyKinds?: readonly SemanticMergeConflictKeyKind[];
  readonly sourcePreservationKey?: string;
  readonly sourcePreservationKeys?: readonly string[];
  readonly sourcePreservationConflictKeys?: readonly string[];
  readonly conflictSidecars?: readonly (JsTsConflictSidecarInput | JsTsConflictSidecarRecord)[];
  readonly conflicts?: readonly (JsTsConflictSidecarInput | JsTsConflictSidecarRecord)[];
  readonly reasons?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface SemanticMergeAdmissionConflictKeyOptions {
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourcePath?: string;
  readonly regions?: readonly (string | { readonly id?: string })[];
  readonly effects?: readonly string[];
  readonly generatedSpans?: readonly SourceMapGeneratedSpan[];
  readonly sourcePreservations?: readonly SourcePreservationRecord[];
  readonly sourcePreservationKeys?: readonly (string | { readonly id?: string })[];
  readonly sourcePreservationConflictKeys?: readonly string[];
  readonly mergeContracts?: readonly SemanticMergeContractRecord[];
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
  readonly conflicts?: readonly SemanticMergeConflictSidecarInput[];
  readonly competingCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly jsTsSafeMergeApplyRecord?: JsTsSafeMergeApplyInput | JsTsSafeMergeApplyRecord;
  readonly jsTsSafeMergeApplyRecords?: readonly (JsTsSafeMergeApplyInput | JsTsSafeMergeApplyRecord)[];
  readonly safeMergeApplyRecord?: JsTsSafeMergeApplyInput | JsTsSafeMergeApplyRecord;
  readonly safeMergeApplyRecords?: readonly (JsTsSafeMergeApplyInput | JsTsSafeMergeApplyRecord)[];
  readonly applyGate?: JsTsSafeMergeApplyInput | JsTsSafeMergeApplyRecord;
  readonly applyGates?: readonly (JsTsSafeMergeApplyInput | JsTsSafeMergeApplyRecord)[];
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
  readonly conflicts: readonly SemanticMergeConflictSidecarRecord[];
  readonly evidence: readonly EvidenceRecord[];
  readonly losses: readonly NativeAstLossRecord[];
  readonly metadata: JsonObject;
}

export declare const SEMANTIC_MERGE_ADMISSION_CLASSIFICATIONS: readonly SemanticMergeAdmissionClassification[];
export declare const SEMANTIC_MERGE_ADMISSION_CONFLICT_KEY_KINDS: readonly SemanticMergeConflictKeyKind[];
export declare const JS_TS_SEMANTIC_MERGE_SAFE_CONTRACT_KINDS: readonly JsTsSemanticMergeSafeContractKind[];
export declare const JS_TS_SEMANTIC_MERGE_REQUIRED_CONFLICT_KEY_KINDS: readonly SemanticMergeConflictKeyKind[];
export declare const SEMANTIC_MERGE_ADMISSION_CONFLICT_REASON_CODES: readonly SemanticMergeConflictReasonCode[];
export declare const SEMANTIC_MERGE_DYNAMIC_EFFECTS: readonly string[];

export declare function semanticMergeGeneratedOutputConflictKey(
  generatedSpan: SourceMapGeneratedSpan,
  context?: SemanticMergeGeneratedOutputConflictKeyContext
): string;

export declare function semanticMergeSourcePreservationConflictKey(
  sourcePreservation: SourcePreservationRecord | SourceMapMappingRecord,
  context?: SemanticMergeSourcePreservationConflictKeyContext
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
