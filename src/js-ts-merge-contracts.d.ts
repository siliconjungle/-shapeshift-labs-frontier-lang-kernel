import type { FrontierSourceLanguage, JsonObject, JsonValue, SemanticId, SourceSpan } from "./base.js";

export type JsTsImportKind =
  | "value"
  | "type"
  | "namespace"
  | "side-effect"
  | "dynamic"
  | "export"
  | "require"
  | string;

export type JsTsImportSpecifierKind =
  | "default"
  | "named"
  | "namespace"
  | "type"
  | "side-effect"
  | string;

export type JsTsTopLevelDeclarationKind =
  | "class"
  | "interface"
  | "function"
  | "type"
  | "enum"
  | "variable"
  | "namespace"
  | "module"
  | "export"
  | "declaration"
  | string;

export type JsTsMemberKind =
  | "constructor"
  | "method"
  | "property"
  | "field"
  | "accessor"
  | "getter"
  | "setter"
  | "callSignature"
  | "indexSignature"
  | "constructSignature"
  | "member"
  | string;

export type JsTsMemberAccessibility = "public" | "protected" | "private" | "package" | string;

export type JsTsTriviaKind =
  | "comment"
  | "lineComment"
  | "blockComment"
  | "whitespace"
  | "shebang"
  | "directive"
  | "separator"
  | string;

export type JsTsTriviaPlacement = "leading" | "trailing" | "inner" | "detached" | string;

export type JsTsConflictKind =
  | "overlap"
  | "rename"
  | "delete-modify"
  | "order"
  | "trivia"
  | "signature"
  | "body"
  | "import"
  | "member"
  | "custom"
  | string;

export type JsTsConflictTargetKind =
  | "contract"
  | "import"
  | "topLevelDeclaration"
  | "member"
  | "trivia"
  | "sourceSpan"
  | string;

export type JsTsConflictSide = "base" | "left" | "right" | "merged" | "ancestor" | string;

export interface JsTsImportSpecifierRecord {
  readonly kind: JsTsImportSpecifierKind;
  readonly importedName?: string;
  readonly localName?: string;
  readonly exportedName?: string;
  readonly sourceSpan?: SourceSpan;
  readonly metadata?: JsonObject;
}

export interface JsTsImportAttributeRecord {
  readonly key: string;
  readonly value?: string;
  readonly sourceSpan?: SourceSpan;
  readonly metadata?: JsonObject;
}

export interface JsTsMergeImportInput {
  readonly id?: string;
  readonly importKind?: JsTsImportKind;
  readonly moduleSpecifier?: string;
  readonly specifiers?: readonly JsTsImportSpecifierRecord[];
  readonly attributes?: readonly JsTsImportAttributeRecord[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans?: readonly SourceSpan[];
  readonly semanticNodeId?: SemanticId;
  readonly semanticNodeIds?: readonly SemanticId[];
  readonly semanticSymbolId?: string;
  readonly semanticSymbolIds?: readonly string[];
  readonly nativeAstNodeId?: string;
  readonly nativeAstNodeIds?: readonly string[];
  readonly leadingTriviaIds?: readonly string[];
  readonly trailingTriviaIds?: readonly string[];
  readonly triviaIds?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsMergeImportRecord {
  readonly kind: "frontier.lang.jsTsMergeImport";
  readonly version: 1;
  readonly id: string;
  readonly importKind: JsTsImportKind;
  readonly moduleSpecifier?: string;
  readonly specifiers: readonly JsTsImportSpecifierRecord[];
  readonly attributes: readonly JsTsImportAttributeRecord[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans: readonly SourceSpan[];
  readonly semanticNodeIds: readonly SemanticId[];
  readonly semanticSymbolIds: readonly string[];
  readonly nativeAstNodeIds: readonly string[];
  readonly triviaIds: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly metadata: JsonObject;
}

export interface JsTsTopLevelDeclarationInput {
  readonly id?: string;
  readonly declarationKind?: JsTsTopLevelDeclarationKind;
  readonly name?: string;
  readonly exported?: boolean;
  readonly defaultExport?: boolean;
  readonly ambient?: boolean;
  readonly modifier?: string;
  readonly modifiers?: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans?: readonly SourceSpan[];
  readonly nameSpan?: SourceSpan;
  readonly bodySpan?: SourceSpan;
  readonly semanticNodeId?: SemanticId;
  readonly semanticNodeIds?: readonly SemanticId[];
  readonly semanticSymbolId?: string;
  readonly semanticSymbolIds?: readonly string[];
  readonly nativeAstNodeId?: string;
  readonly nativeAstNodeIds?: readonly string[];
  readonly memberId?: string;
  readonly memberIds?: readonly string[];
  readonly members?: readonly (JsTsMemberInput | JsTsMemberRecord)[];
  readonly leadingTriviaIds?: readonly string[];
  readonly trailingTriviaIds?: readonly string[];
  readonly triviaIds?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsTopLevelDeclarationRecord {
  readonly kind: "frontier.lang.jsTsMergeTopLevelDeclaration";
  readonly version: 1;
  readonly id: string;
  readonly declarationKind: JsTsTopLevelDeclarationKind;
  readonly name?: string;
  readonly exported: boolean;
  readonly defaultExport: boolean;
  readonly ambient: boolean;
  readonly modifiers: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans: readonly SourceSpan[];
  readonly nameSpan?: SourceSpan;
  readonly bodySpan?: SourceSpan;
  readonly semanticNodeIds: readonly SemanticId[];
  readonly semanticSymbolIds: readonly string[];
  readonly nativeAstNodeIds: readonly string[];
  readonly memberIds: readonly string[];
  readonly triviaIds: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly metadata: JsonObject;
}

export interface JsTsMemberInput {
  readonly id?: string;
  readonly ownerDeclarationId?: string;
  readonly ownerId?: string;
  readonly memberKind?: JsTsMemberKind;
  readonly name?: string;
  readonly accessibility?: JsTsMemberAccessibility;
  readonly static?: boolean;
  readonly optional?: boolean;
  readonly computed?: boolean;
  readonly modifier?: string;
  readonly modifiers?: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans?: readonly SourceSpan[];
  readonly keySpan?: SourceSpan;
  readonly valueSpan?: SourceSpan;
  readonly semanticNodeId?: SemanticId;
  readonly semanticNodeIds?: readonly SemanticId[];
  readonly semanticSymbolId?: string;
  readonly semanticSymbolIds?: readonly string[];
  readonly nativeAstNodeId?: string;
  readonly nativeAstNodeIds?: readonly string[];
  readonly leadingTriviaIds?: readonly string[];
  readonly trailingTriviaIds?: readonly string[];
  readonly triviaIds?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsMemberRecord {
  readonly kind: "frontier.lang.jsTsMergeMember";
  readonly version: 1;
  readonly id: string;
  readonly ownerDeclarationId?: string;
  readonly ownerId?: string;
  readonly memberKind: JsTsMemberKind;
  readonly name?: string;
  readonly accessibility?: JsTsMemberAccessibility;
  readonly static: boolean;
  readonly optional: boolean;
  readonly computed: boolean;
  readonly modifiers: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans: readonly SourceSpan[];
  readonly keySpan?: SourceSpan;
  readonly valueSpan?: SourceSpan;
  readonly semanticNodeIds: readonly SemanticId[];
  readonly semanticSymbolIds: readonly string[];
  readonly nativeAstNodeIds: readonly string[];
  readonly triviaIds: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly metadata: JsonObject;
}

export interface JsTsTriviaInput {
  readonly id?: string;
  readonly triviaKind?: JsTsTriviaKind;
  readonly placement?: JsTsTriviaPlacement;
  readonly attachedToId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly span?: SourceSpan;
  readonly sourceSpans?: readonly SourceSpan[];
  readonly textHash?: string;
  readonly conflictKeys?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsTriviaRecord {
  readonly kind: "frontier.lang.jsTsMergeTrivia";
  readonly version: 1;
  readonly id: string;
  readonly triviaKind: JsTsTriviaKind;
  readonly placement: JsTsTriviaPlacement;
  readonly attachedToId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans: readonly SourceSpan[];
  readonly textHash?: string;
  readonly conflictKeys: readonly string[];
  readonly metadata: JsonObject;
}

export interface JsTsConflictSideRecord {
  readonly side: JsTsConflictSide;
  readonly recordId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly triviaIds?: readonly string[];
  readonly contentHash?: string;
  readonly conflictKeys?: readonly string[];
  readonly payload?: JsonValue;
  readonly metadata?: JsonObject;
}

export interface JsTsConflictResolutionRecord {
  readonly status: "unresolved" | "resolved" | "accepted-left" | "accepted-right" | "manual" | string;
  readonly chosenSide?: JsTsConflictSide;
  readonly recordId?: string;
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsConflictSidecarInput {
  readonly id?: string;
  readonly conflictKind?: JsTsConflictKind;
  readonly targetKind?: JsTsConflictTargetKind;
  readonly targetId?: string;
  readonly conflictKeys?: readonly string[];
  readonly sides?: readonly JsTsConflictSideRecord[];
  readonly resolution?: JsTsConflictResolutionRecord;
  readonly evidenceId?: string;
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsConflictSidecarRecord {
  readonly kind: "frontier.lang.jsTsMergeConflictSidecar";
  readonly version: 1;
  readonly id: string;
  readonly conflictKind: JsTsConflictKind;
  readonly targetKind: JsTsConflictTargetKind;
  readonly targetId?: string;
  readonly conflictKeys: readonly string[];
  readonly sides: readonly JsTsConflictSideRecord[];
  readonly resolution?: JsTsConflictResolutionRecord;
  readonly evidenceIds: readonly string[];
  readonly metadata: JsonObject;
}

export interface JsTsMergeContractInput {
  readonly id?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly moduleFormat?: "esm" | "commonjs" | "script" | string;
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans?: readonly SourceSpan[];
  readonly imports?: readonly (JsTsMergeImportInput | JsTsMergeImportRecord)[];
  readonly topLevelDeclarations?: readonly (JsTsTopLevelDeclarationInput | JsTsTopLevelDeclarationRecord)[];
  readonly declarations?: readonly (JsTsTopLevelDeclarationInput | JsTsTopLevelDeclarationRecord)[];
  readonly members?: readonly (JsTsMemberInput | JsTsMemberRecord)[];
  readonly trivia?: readonly (JsTsTriviaInput | JsTsTriviaRecord)[];
  readonly conflictSidecars?: readonly (JsTsConflictSidecarInput | JsTsConflictSidecarRecord)[];
  readonly conflicts?: readonly (JsTsConflictSidecarInput | JsTsConflictSidecarRecord)[];
  readonly evidenceId?: string;
  readonly evidenceIds?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface JsTsMergeContractRecord {
  readonly kind: "frontier.lang.jsTsMergeContract";
  readonly version: 1;
  readonly id: string;
  readonly language: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly moduleFormat?: "esm" | "commonjs" | "script" | string;
  readonly sourceSpan?: SourceSpan;
  readonly sourceSpans: readonly SourceSpan[];
  readonly imports: readonly JsTsMergeImportRecord[];
  readonly topLevelDeclarations: readonly JsTsTopLevelDeclarationRecord[];
  readonly members: readonly JsTsMemberRecord[];
  readonly trivia: readonly JsTsTriviaRecord[];
  readonly conflictSidecars: readonly JsTsConflictSidecarRecord[];
  readonly evidenceIds: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly metadata: JsonObject;
}

export declare const JS_TS_MERGE_CONTRACT_LANGUAGES: readonly ("javascript" | "typescript")[];

export declare function createJsTsMergeImportRecord(input?: JsTsMergeImportInput): JsTsMergeImportRecord;
export declare function createJsTsTopLevelDeclarationRecord(input?: JsTsTopLevelDeclarationInput): JsTsTopLevelDeclarationRecord;
export declare function createJsTsMemberRecord(input?: JsTsMemberInput): JsTsMemberRecord;
export declare function createJsTsTriviaRecord(input?: JsTsTriviaInput): JsTsTriviaRecord;
export declare function createJsTsConflictSidecarRecord(input?: JsTsConflictSidecarInput): JsTsConflictSidecarRecord;
export declare function createJsTsMergeContractRecord(input?: JsTsMergeContractInput): JsTsMergeContractRecord;
export declare function jsTsMergeContractConflictKeys(contract?: Partial<JsTsMergeContractRecord>): readonly string[];
