import type { FrontierSourceLanguage, JsonObject, SourceSpan } from "./base.js";
import type { JsTsMergeContractRecord } from "./js-ts-merge-contracts.js";

export type JsTsSafeMemberMergeClassification =
  | "unchanged"
  | "safe-member-add"
  | "conflict";

export type JsTsSafeMemberMergeSide = "left" | "right" | "both";

export type JsTsSafeMemberMergeChangeKind =
  | "add"
  | "computed"
  | "delete"
  | "duplicate"
  | "edit"
  | "order"
  | "source"
  | "span"
  | "unstable-key"
  | string;

export type JsTsSafeMergeBodyKind =
  | "class"
  | "interface"
  | "type"
  | "object"
  | string;

export type JsTsSafeMergeMemberKind =
  | "constructor"
  | "field"
  | "getter"
  | "method"
  | "property"
  | "setter"
  | "callSignature"
  | "member"
  | string;

export interface JsTsSafeMergeOptions {
  readonly sourcePath?: string;
  readonly language?: FrontierSourceLanguage;
}

export interface JsTsSafeMergeMemberRecord {
  readonly kind: "frontier.lang.jsTsSafeMergeMember";
  readonly version: 1;
  readonly id: string;
  readonly bodyKey: string;
  readonly memberKind: JsTsSafeMergeMemberKind;
  readonly name?: string;
  readonly identityKey: string;
  readonly conflictKeys: readonly string[];
  readonly computed: boolean;
  readonly stableKey: boolean;
  readonly sourceSpan?: SourceSpan;
  readonly keySpan?: SourceSpan;
  readonly contentHash: string;
  readonly text?: string;
  readonly normalizedText?: string;
  readonly metadata: JsonObject;
}

export interface JsTsSafeMergeBodyRecord {
  readonly kind: "frontier.lang.jsTsSafeMergeBody";
  readonly version: 1;
  readonly id: string;
  readonly bodyKind: JsTsSafeMergeBodyKind;
  readonly name?: string;
  readonly identityKey: string;
  readonly conflictKeys: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly bodySpan?: SourceSpan;
  readonly members: readonly JsTsSafeMergeMemberRecord[];
  readonly contentHash: string;
  readonly text?: string;
  readonly metadata: JsonObject;
}

export interface JsTsSafeMemberMergeInput extends JsTsSafeMergeOptions {
  readonly id?: string;
  readonly baseSource?: string;
  readonly leftSource?: string;
  readonly rightSource?: string;
  readonly base?: string;
  readonly left?: string;
  readonly right?: string;
  readonly baseBodies?: readonly JsTsSafeMergeBodyRecord[];
  readonly leftBodies?: readonly JsTsSafeMergeBodyRecord[];
  readonly rightBodies?: readonly JsTsSafeMergeBodyRecord[];
  readonly baseContract?: JsTsMergeContractRecord;
  readonly leftContract?: JsTsMergeContractRecord;
  readonly rightContract?: JsTsMergeContractRecord;
  readonly baseMergeContract?: JsTsMergeContractRecord;
  readonly leftMergeContract?: JsTsMergeContractRecord;
  readonly rightMergeContract?: JsTsMergeContractRecord;
  readonly metadata?: JsonObject;
}

export interface JsTsSafeMemberMergeClassificationRecord {
  readonly kind: "frontier.lang.jsTsSafeMemberMergeClassification";
  readonly version: 1;
  readonly bodyKey: string;
  readonly classification: JsTsSafeMemberMergeClassification;
  readonly side: JsTsSafeMemberMergeSide;
  readonly changeKind: JsTsSafeMemberMergeChangeKind;
  readonly baseBodies: readonly JsTsSafeMergeBodyRecord[];
  readonly leftBodies: readonly JsTsSafeMergeBodyRecord[];
  readonly rightBodies: readonly JsTsSafeMergeBodyRecord[];
  readonly members: readonly JsTsSafeMergeMemberRecord[];
  readonly reasons: readonly string[];
}

export interface JsTsSafeMemberMergeAdmissionRecord {
  readonly kind: "frontier.lang.jsTsSafeMemberMergeAdmission";
  readonly version: 1;
  readonly id: string;
  readonly classification: JsTsSafeMemberMergeClassification;
  readonly autoMergeable: boolean;
  readonly mergedSource?: string;
  readonly bodyKeys: readonly string[];
  readonly safeAdds: readonly JsTsSafeMemberMergeClassificationRecord[];
  readonly conflicts: readonly JsTsSafeMemberMergeClassificationRecord[];
  readonly bodies: {
    readonly base: readonly JsTsSafeMergeBodyRecord[];
    readonly left: readonly JsTsSafeMergeBodyRecord[];
    readonly right: readonly JsTsSafeMergeBodyRecord[];
  };
  readonly metadata: JsonObject;
}

export declare const JS_TS_SAFE_MEMBER_MERGE_CLASSIFICATIONS: readonly JsTsSafeMemberMergeClassification[];

export declare function collectJsTsSafeMergeBodies(
  sourceText: string,
  options?: JsTsSafeMergeOptions
): readonly JsTsSafeMergeBodyRecord[];

export declare function jsTsSafeMemberIdentityKey(
  input: {
    readonly bodyKey?: string;
    readonly ownerBodyKey?: string;
    readonly ownerDeclarationId?: string;
    readonly ownerId?: string;
    readonly name?: string;
    readonly memberName?: string;
    readonly sourcePath?: string;
  },
  options?: JsTsSafeMergeOptions
): string;

export declare function classifyJsTsSafeMemberMerge(
  input?: JsTsSafeMemberMergeInput,
  options?: JsTsSafeMemberMergeInput
): JsTsSafeMemberMergeAdmissionRecord;
