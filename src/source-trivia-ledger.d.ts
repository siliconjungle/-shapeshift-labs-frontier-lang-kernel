import type { FrontierSourceLanguage, JsonObject, SourceSpan } from "./base.js";

export type SourceTriviaSpanKind =
  | "code"
  | "whitespace"
  | "lineComment"
  | "blockComment"
  | "string"
  | "template"
  | string;

export type SourceTriviaSpanRole = "source" | "trivia" | "boundary" | string;

export type SourceTriviaDeclarationKeyword =
  | "import"
  | "export"
  | "function"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "const"
  | "let"
  | "var"
  | "namespace"
  | "module"
  | "declare"
  | string;

export type SourceTriviaImportKind = "value" | "type" | "sideEffect" | string;

export type SourceTriviaMemberKind = "class" | "interface" | "type" | "object" | string;

export interface SourceTriviaSpanRecord {
  readonly id: string;
  readonly kind: SourceTriviaSpanKind;
  readonly role: SourceTriviaSpanRole;
  readonly span: SourceSpan;
  readonly textHash: string;
  readonly conflictKey: string;
  readonly startDelimiter?: string;
  readonly endDelimiter?: string;
  readonly closed?: boolean;
  readonly lineBreaks?: number;
  readonly metadata?: JsonObject;
}

export interface SourceTriviaBoundaryRecord {
  readonly id: string;
  readonly kind: "source" | string;
  readonly role: "boundary" | SourceTriviaSpanRole;
  readonly span: SourceSpan;
  readonly textHash: string;
  readonly conflictKey: string;
  readonly metadata?: JsonObject;
}

export interface SourceTriviaImportRecord {
  readonly id: string;
  readonly importKind: SourceTriviaImportKind;
  readonly moduleSpecifier?: string;
  readonly span: SourceSpan;
  readonly leadingTriviaIds: readonly string[];
  readonly trailingTriviaIds: readonly string[];
  readonly adjacentTriviaIds: readonly string[];
  readonly textHash: string;
  readonly conflictKey: string;
  readonly declarationId?: string;
  readonly metadata?: JsonObject;
}

export interface SourceTriviaDeclarationRecord {
  readonly id: string;
  readonly keyword: SourceTriviaDeclarationKeyword;
  readonly name?: string;
  readonly span: SourceSpan;
  readonly leadingTriviaIds: readonly string[];
  readonly trailingTriviaIds: readonly string[];
  readonly adjacentTriviaIds: readonly string[];
  readonly textHash: string;
  readonly conflictKey: string;
  readonly metadata?: JsonObject;
}

export interface SourceTriviaMemberRecord {
  readonly id: string;
  readonly memberKind: SourceTriviaMemberKind;
  readonly name?: string;
  readonly ownerDeclarationId?: string;
  readonly ownerName?: string;
  readonly span: SourceSpan;
  readonly leadingTriviaIds: readonly string[];
  readonly trailingTriviaIds: readonly string[];
  readonly adjacentTriviaIds: readonly string[];
  readonly textHash: string;
  readonly conflictKey: string;
  readonly metadata?: JsonObject;
}

export interface SourceTriviaLedgerRecord {
  readonly kind: "frontier.lang.sourceTriviaLedger";
  readonly version: 1;
  readonly id: string;
  readonly sourceId?: string;
  readonly sourcePath?: string;
  readonly language: FrontierSourceLanguage;
  readonly sourceHash: string;
  readonly sourceLength: number;
  readonly lineCount: number;
  readonly sourceSpan?: SourceSpan;
  readonly sourceBoundary?: SourceTriviaBoundaryRecord;
  readonly spans: readonly SourceTriviaSpanRecord[];
  readonly triviaSpans: readonly SourceTriviaSpanRecord[];
  readonly imports?: readonly SourceTriviaImportRecord[];
  readonly declarations: readonly SourceTriviaDeclarationRecord[];
  readonly members?: readonly SourceTriviaMemberRecord[];
  readonly conflictKeys: readonly string[];
  readonly metadata?: JsonObject;
}

export interface CreateSourceTriviaLedgerInput {
  readonly id?: string;
  readonly sourceText: string;
  readonly sourceId?: string;
  readonly sourcePath?: string;
  readonly path?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourceHash?: string;
  readonly metadata?: JsonObject;
}

export interface SourceTriviaConflictKeyOptions {
  readonly includeSourceBoundary?: boolean;
  readonly includeSourceSpans?: boolean;
  readonly includeImports?: boolean;
  readonly includeDeclarations?: boolean;
  readonly includeMembers?: boolean;
}

export declare const SourceTriviaSpanKinds: readonly SourceTriviaSpanKind[];

export declare const SourceTriviaDeclarationKeywords: readonly SourceTriviaDeclarationKeyword[];

export declare function createSourceTriviaLedger(input: CreateSourceTriviaLedgerInput): SourceTriviaLedgerRecord;

export declare function collectSourceTriviaConflictKeys(
  input: Pick<SourceTriviaLedgerRecord, "spans" | "declarations"> & Partial<Pick<SourceTriviaLedgerRecord, "sourceBoundary" | "imports" | "members">>,
  options?: SourceTriviaConflictKeyOptions
): readonly string[];

export declare function validateSourceTriviaLedgerRecord(ledger: SourceTriviaLedgerRecord): readonly string[];

export declare function sourceSpanConflictKey(record: {
  readonly kind: SourceTriviaSpanKind;
  readonly role?: SourceTriviaSpanRole;
  readonly span?: SourceSpan;
  readonly sourceId?: string;
  readonly sourcePath?: string;
  readonly textHash?: string;
}): string;

export declare function sourceDeclarationConflictKey(record: {
  readonly keyword: SourceTriviaDeclarationKeyword;
  readonly name?: string;
  readonly span?: SourceSpan;
  readonly sourceId?: string;
  readonly sourcePath?: string;
  readonly textHash?: string;
}): string;

export declare function sourceImportConflictKey(record: {
  readonly importKind?: SourceTriviaImportKind;
  readonly moduleSpecifier?: string;
  readonly span?: SourceSpan;
  readonly sourceId?: string;
  readonly sourcePath?: string;
  readonly textHash?: string;
}): string;

export declare function sourceMemberConflictKey(record: {
  readonly memberKind?: SourceTriviaMemberKind;
  readonly name?: string;
  readonly ownerDeclarationId?: string;
  readonly ownerName?: string;
  readonly span?: SourceSpan;
  readonly sourceId?: string;
  readonly sourcePath?: string;
  readonly textHash?: string;
}): string;
