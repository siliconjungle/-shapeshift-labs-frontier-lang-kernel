import type { FrontierSourceLanguage, JsonObject } from "./base.js";
import type { EvidenceRecord } from "./evidence.js";
import type { SemanticPatchBundle } from "./patching.js";

export type JsTsSafeMergeApplyClassification =
  | "safe-apply"
  | "no-op"
  | "stale"
  | "review-required"
  | "blocked-evidence";

export type JsTsSafeMergeApplyDecision = "accept" | "reject" | "review" | "block";

export type JsTsSafeMergeApplySafeCaseKind = "import" | "declaration" | "member" | string;

export type JsTsSafeMergeApplyConflictSeverity = "info" | "warning" | "error";

export type JsTsSafeMergeConflictKeyKind =
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

export interface JsTsSafeMergeApplyConflictInput {
  readonly id?: string;
  readonly reason?: string;
  readonly summary?: string;
  readonly severity?: JsTsSafeMergeApplyConflictSeverity | string;
  readonly conflictKey?: string;
  readonly conflictKeys?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsSafeMergeApplyConflictRecord {
  readonly id: string;
  readonly reason: string;
  readonly severity: JsTsSafeMergeApplyConflictSeverity;
  readonly conflictKeys: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsSafeMergeApplyInput {
  readonly id?: string;
  readonly candidateId?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly safeCaseKind?: JsTsSafeMergeApplySafeCaseKind;
  readonly applyKind?: JsTsSafeMergeApplySafeCaseKind;
  readonly case?: JsTsSafeMergeApplySafeCaseKind;
  readonly contractKind?: JsTsSafeMergeApplySafeCaseKind;
  readonly operationKind?: JsTsSafeMergeApplySafeCaseKind;
  readonly kind?: string;
  readonly status?: string;
  readonly readiness?: string;
  readonly safe?: boolean;
  readonly autoApply?: boolean;
  readonly autoApplyable?: boolean;
  readonly autoMergeable?: boolean;
  readonly changed?: boolean;
  readonly noOp?: boolean;
  readonly noop?: boolean;
  readonly stale?: boolean;
  readonly operationCount?: number;
  readonly semanticChangeCount?: number;
  readonly operations?: readonly unknown[];
  readonly patch?: SemanticPatchBundle;
  readonly patchId?: string;
  readonly patchIds?: readonly string[];
  readonly sourceHash?: string;
  readonly currentSourceHash?: string;
  readonly baseHash?: string;
  readonly expectedBaseHash?: string;
  readonly currentBaseHash?: string;
  readonly targetHash?: string;
  readonly currentTargetHash?: string;
  readonly conflictKey?: string;
  readonly conflictKeys?: readonly string[];
  readonly conflictKeyKinds?: readonly JsTsSafeMergeConflictKeyKind[];
  readonly conflictSidecars?: readonly (string | JsTsSafeMergeApplyConflictInput)[];
  readonly conflicts?: readonly (string | JsTsSafeMergeApplyConflictInput)[];
  readonly hasConflicts?: boolean;
  readonly contractId?: string;
  readonly contractIds?: readonly string[];
  readonly mergeContractId?: string;
  readonly mergeContractIds?: readonly string[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly evidenceId?: string;
  readonly evidenceIds?: readonly string[];
  readonly requiredEvidenceId?: string;
  readonly requiredEvidenceIds?: readonly string[];
  readonly passedEvidenceIds?: readonly string[];
  readonly failedEvidenceIds?: readonly string[];
  readonly unknownEvidenceIds?: readonly string[];
  readonly missingEvidenceIds?: readonly string[];
  readonly reasons?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsSafeMergeApplyRecord {
  readonly kind: "frontier.lang.jsTsSafeMergeApply";
  readonly version: 1;
  readonly id: string;
  readonly candidateId?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly safeCaseKind: JsTsSafeMergeApplySafeCaseKind;
  readonly classification: JsTsSafeMergeApplyClassification;
  readonly decision: JsTsSafeMergeApplyDecision;
  readonly autoApplyable: boolean;
  readonly changed: boolean;
  readonly noOp: boolean;
  readonly stale: boolean;
  readonly operationCount?: number;
  readonly sourceHash?: string;
  readonly currentSourceHash?: string;
  readonly baseHash?: string;
  readonly expectedBaseHash?: string;
  readonly currentBaseHash?: string;
  readonly targetHash?: string;
  readonly currentTargetHash?: string;
  readonly patchIds: readonly string[];
  readonly contractIds: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly conflictKeyKinds: readonly JsTsSafeMergeConflictKeyKind[];
  readonly conflicts: readonly JsTsSafeMergeApplyConflictRecord[];
  readonly evidence: readonly EvidenceRecord[];
  readonly evidenceIds: readonly string[];
  readonly requiredEvidenceIds: readonly string[];
  readonly passedEvidenceIds: readonly string[];
  readonly failedEvidenceIds: readonly string[];
  readonly unknownEvidenceIds: readonly string[];
  readonly missingEvidenceIds: readonly string[];
  readonly reasons: readonly string[];
  readonly metadata: JsonObject;
}

export declare const JS_TS_SAFE_MERGE_APPLY_CLASSIFICATIONS: readonly JsTsSafeMergeApplyClassification[];
export declare const JS_TS_SAFE_MERGE_APPLY_DECISIONS: readonly JsTsSafeMergeApplyDecision[];
export declare const JS_TS_SAFE_MERGE_APPLY_SAFE_CASE_KINDS: readonly ("import" | "declaration" | "member")[];

export declare function createJsTsSafeMergeApplyRecord(input?: JsTsSafeMergeApplyInput): JsTsSafeMergeApplyRecord;
export declare function classifyJsTsSafeMergeApplyRecord(input?: JsTsSafeMergeApplyInput): JsTsSafeMergeApplyRecord;
export declare function classifyJsTsSafeMergeApplyRecords(
  records?: readonly JsTsSafeMergeApplyInput[]
): readonly JsTsSafeMergeApplyRecord[];
