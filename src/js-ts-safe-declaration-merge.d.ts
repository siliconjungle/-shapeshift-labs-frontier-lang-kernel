import type { JsonObject, SourceSpan } from "./base.js";
import type {
  JsTsTopLevelDeclarationMergeAdmissionRecord,
  JsTsTopLevelDeclarationRecord
} from "./js-ts-declarations.js";
import type { JsTsConflictSidecarRecord } from "./js-ts-merge-contracts.js";

export type JsTsSafeMergeClassification = "unchanged" | "safe" | "review-required";

export interface JsTsSafeTopLevelDeclarationMergeInput {
  readonly id?: string;
  readonly baseSource?: string;
  readonly leftSource?: string;
  readonly rightSource?: string;
  readonly base?: string;
  readonly left?: string;
  readonly right?: string;
  readonly baseDeclarations?: readonly JsTsTopLevelDeclarationRecord[];
  readonly leftDeclarations?: readonly JsTsTopLevelDeclarationRecord[];
  readonly rightDeclarations?: readonly JsTsTopLevelDeclarationRecord[];
  readonly sourcePath?: string;
  readonly language?: string;
  readonly mergeLaws?: readonly unknown[];
  readonly metadata?: JsonObject;
}

export interface JsTsSafeAppliedTopLevelDeclarationRecord {
  readonly declarationKey: string;
  readonly side: "left" | "right";
  readonly text: string;
  readonly insertOffset: number;
  readonly anchor: string;
  readonly sourceSpan?: SourceSpan;
}

export interface JsTsSafeTopLevelDeclarationMergeResult {
  readonly kind: "frontier.lang.jsTsSafeTopLevelDeclarationMerge";
  readonly version: 1;
  readonly id: string;
  readonly classification: JsTsSafeMergeClassification;
  readonly autoMergeable: boolean;
  readonly mergedSource?: string;
  readonly appliedDeclarations: readonly JsTsSafeAppliedTopLevelDeclarationRecord[];
  readonly conflicts: readonly JsTsConflictSidecarRecord[];
  readonly admission: JsTsTopLevelDeclarationMergeAdmissionRecord;
  readonly metadata: JsonObject;
}

export declare const JS_TS_SAFE_MERGE_CLASSIFICATIONS: readonly JsTsSafeMergeClassification[];

export declare function mergeTopLevelJsTsDeclarations(
  input?: JsTsSafeTopLevelDeclarationMergeInput,
  options?: JsTsSafeTopLevelDeclarationMergeInput
): JsTsSafeTopLevelDeclarationMergeResult;

export declare const mergeSafeTopLevelJsTsDeclarations: typeof mergeTopLevelJsTsDeclarations;
