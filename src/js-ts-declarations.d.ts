import type { FrontierSourceLanguage, JsonObject, SourceSpan } from "./base.js";

export type JsTsTopLevelDeclarationKind =
  | "function"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "default";

export type JsTsVariableDeclarationKind = "const" | "let" | "var";

export type JsTsTopLevelDeclarationExportKind = "none" | "named" | "default";

export type JsTsTopLevelDeclarationMergeClassification =
  | "unchanged"
  | "safe-add"
  | "safe-by-merge-law"
  | "conflict";

export type JsTsTopLevelDeclarationMergeSide = "left" | "right" | "both";

export type JsTsTopLevelDeclarationChangeKind = "add" | "edit" | "delete";

export interface JsTsTopLevelDeclarationOptions {
  readonly sourcePath?: string;
  readonly language?: FrontierSourceLanguage;
}

export interface JsTsTopLevelDeclarationRecord {
  readonly kind: "frontier.lang.jsTsTopLevelDeclaration";
  readonly version: 1;
  readonly id: string;
  readonly declarationKind: JsTsTopLevelDeclarationKind;
  readonly variableKind?: JsTsVariableDeclarationKind;
  readonly name?: string;
  readonly names: readonly string[];
  readonly exportKind: JsTsTopLevelDeclarationExportKind;
  readonly defaultExport: boolean;
  readonly modifiers: readonly string[];
  readonly identityKey: string;
  readonly declarationKeys: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly contentHash: string;
  readonly span: SourceSpan;
  readonly text: string;
  readonly normalizedText: string;
  readonly metadata: JsonObject;
}

export interface JsTsTopLevelDeclarationMergeLaw {
  readonly id?: string;
  readonly declarationKey?: string;
  readonly declarationKeys?: readonly string[];
  readonly name?: string;
  readonly action?: "allow" | "safe" | "safe-add" | "safe-by-merge-law" | string;
  readonly classification?: "allow" | "safe" | "safe-add" | "safe-by-merge-law" | string;
  readonly metadata?: JsonObject;
}

export interface JsTsTopLevelDeclarationMergeInput extends JsTsTopLevelDeclarationOptions {
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
  readonly mergeLaws?: readonly (string | JsTsTopLevelDeclarationMergeLaw)[];
  readonly metadata?: JsonObject;
}

export interface JsTsTopLevelDeclarationClassificationRecord {
  readonly kind: "frontier.lang.jsTsTopLevelDeclarationMergeClassification";
  readonly version: 1;
  readonly declarationKey: string;
  readonly classification: JsTsTopLevelDeclarationMergeClassification;
  readonly side: JsTsTopLevelDeclarationMergeSide;
  readonly changeKind: JsTsTopLevelDeclarationChangeKind;
  readonly baseDeclarations: readonly JsTsTopLevelDeclarationRecord[];
  readonly leftDeclarations: readonly JsTsTopLevelDeclarationRecord[];
  readonly rightDeclarations: readonly JsTsTopLevelDeclarationRecord[];
  readonly mergeLaw?: string | JsTsTopLevelDeclarationMergeLaw;
  readonly reasons: readonly string[];
}

export interface JsTsTopLevelDeclarationMergeAdmissionRecord {
  readonly kind: "frontier.lang.jsTsTopLevelDeclarationMergeAdmission";
  readonly version: 1;
  readonly id: string;
  readonly classification: JsTsTopLevelDeclarationMergeClassification;
  readonly autoMergeable: boolean;
  readonly declarationKeys: readonly string[];
  readonly safeAdds: readonly JsTsTopLevelDeclarationClassificationRecord[];
  readonly safeByMergeLaw: readonly JsTsTopLevelDeclarationClassificationRecord[];
  readonly conflicts: readonly JsTsTopLevelDeclarationClassificationRecord[];
  readonly declarations: {
    readonly base: readonly JsTsTopLevelDeclarationRecord[];
    readonly left: readonly JsTsTopLevelDeclarationRecord[];
    readonly right: readonly JsTsTopLevelDeclarationRecord[];
  };
  readonly metadata: JsonObject;
}

export declare const JS_TS_TOP_LEVEL_DECLARATION_MERGE_CLASSIFICATIONS: readonly JsTsTopLevelDeclarationMergeClassification[];

export declare function collectTopLevelJsTsDeclarations(
  sourceText: string,
  options?: JsTsTopLevelDeclarationOptions
): readonly JsTsTopLevelDeclarationRecord[];

export declare function topLevelJsTsDeclarationIdentityKey(
  input: Partial<JsTsTopLevelDeclarationRecord> & JsTsTopLevelDeclarationOptions,
  options?: JsTsTopLevelDeclarationOptions
): string;

export declare function classifyTopLevelJsTsDeclarationMerge(
  input: JsTsTopLevelDeclarationMergeInput,
  options?: JsTsTopLevelDeclarationMergeInput
): JsTsTopLevelDeclarationMergeAdmissionRecord;
