import type { FrontierSourceLanguage, JsonObject, SourceSpan } from "./base.js";
import type {
  JsTsConflictSidecarRecord,
  JsTsMergeContractInput,
  JsTsMergeContractRecord,
  JsTsMergeImportRecord
} from "./js-ts-merge-contracts.js";

export type JsTsSafeImportMergeStatus = "unchanged" | "merged" | "conflict";
export type JsTsSafeImportMergeSide = "base" | "left" | "right" | "target" | string;
export type JsTsSafeImportMergeEditKind = "insert";

export interface JsTsSafeImportMergeOptions {
  readonly id?: string;
  readonly sourcePath?: string;
  readonly language?: FrontierSourceLanguage;
  readonly targetSide?: JsTsSafeImportMergeSide;
  readonly metadata?: JsonObject;
}

export interface JsTsSafeImportMergeInput extends JsTsSafeImportMergeOptions {
  readonly baseSource?: string;
  readonly leftSource?: string;
  readonly rightSource?: string;
  readonly base?: string;
  readonly left?: string;
  readonly right?: string;
  readonly sourceText?: string;
  readonly targetSource?: string;
  readonly baseContract?: JsTsMergeContractInput | JsTsMergeContractRecord;
  readonly leftContract?: JsTsMergeContractInput | JsTsMergeContractRecord;
  readonly rightContract?: JsTsMergeContractInput | JsTsMergeContractRecord;
  readonly targetContract?: JsTsMergeContractInput | JsTsMergeContractRecord;
}

export interface JsTsSafeImportEditRecord {
  readonly kind: "frontier.lang.jsTsSafeImportEdit";
  readonly version: 1;
  readonly editKind: JsTsSafeImportMergeEditKind;
  readonly offset: number;
  readonly side: JsTsSafeImportMergeSide;
  readonly text: string;
  readonly importIds: readonly string[];
  readonly conflictKeys: readonly string[];
}

export interface JsTsSafeAppliedImportRecord {
  readonly side: JsTsSafeImportMergeSide;
  readonly recordId: string;
  readonly identityKey: string;
  readonly moduleKey: string;
  readonly moduleSpecifier?: string;
  readonly sourceSpan?: SourceSpan;
  readonly conflictKeys: readonly string[];
}

export interface JsTsSafeImportMergeRecord {
  readonly kind: "frontier.lang.jsTsSafeImportMerge";
  readonly version: 1;
  readonly id: string;
  readonly status: JsTsSafeImportMergeStatus;
  readonly autoMergeable: boolean;
  readonly sourcePath?: string;
  readonly language: FrontierSourceLanguage;
  readonly targetSide: JsTsSafeImportMergeSide;
  readonly sourceText: string;
  readonly mergedSource: string;
  readonly edits: readonly JsTsSafeImportEditRecord[];
  readonly appliedImports: readonly JsTsSafeAppliedImportRecord[];
  readonly conflictSidecars: readonly JsTsConflictSidecarRecord[];
  readonly conflicts: readonly JsTsConflictSidecarRecord[];
  readonly conflictKeys: readonly string[];
  readonly metadata: JsonObject;
}

export declare const JS_TS_SAFE_IMPORT_MERGE_STATUSES: readonly JsTsSafeImportMergeStatus[];

export declare function createJsTsSafeImportMerge(
  input?: JsTsSafeImportMergeInput,
  options?: JsTsSafeImportMergeOptions
): JsTsSafeImportMergeRecord;

export declare function mergeJsTsSafeImports(
  input?: JsTsSafeImportMergeInput,
  options?: JsTsSafeImportMergeOptions
): JsTsSafeImportMergeRecord;

export declare function jsTsImportIdentityKey(
  record?: Partial<JsTsMergeImportRecord>,
  options?: JsTsSafeImportMergeOptions
): string;
