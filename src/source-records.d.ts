import type { EvidenceRecord } from "./evidence.js";
import type { FrontierSourceLanguage, JsonObject, JsonValue, SemanticId, SourceSpan } from "./base.js";
import type { NativeAstLossKind, SourcePreservationLevel } from "./constants.js";

export interface NativeAstNode {
  readonly id: string;
  readonly kind: string;
  readonly languageKind?: string;
  readonly span?: SourceSpan;
  readonly value?: JsonValue;
  readonly fields?: Readonly<Record<string, JsonValue | readonly string[] | string | null>>;
  readonly children?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface NativeAstLossRecord {
  readonly id: string;
  readonly severity: "info" | "warning" | "error";
  readonly phase?: "read" | "filter" | "write" | "project" | "merge" | string;
  readonly sourceFormat?: string;
  readonly targetFormat?: string;
  readonly kind: NativeAstLossKind;
  readonly message: string;
  readonly span?: SourceSpan;
  readonly nodeId?: string;
  readonly semanticIndexId?: string;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly sourceMapId?: string;
  readonly sourceMapMappingId?: string;
  readonly preservation?: SourcePreservationLevel;
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface NativeAstRecord {
  readonly kind: "frontier.lang.nativeAst";
  readonly version: 1;
  readonly id: string;
  readonly language: FrontierSourceLanguage;
  readonly parser?: string;
  readonly parserVersion?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly rootId: string;
  readonly nodes: Readonly<Record<string, NativeAstNode>>;
  readonly losses?: readonly NativeAstLossRecord[];
  readonly metadata?: JsonObject;
}

export type SemanticIndexSymbolKind =
  | "module"
  | "package"
  | "namespace"
  | "type"
  | "class"
  | "interface"
  | "trait"
  | "protocol"
  | "function"
  | "method"
  | "field"
  | "property"
  | "variable"
  | "constant"
  | "parameter"
  | string;

export type SemanticIndexOccurrenceRole =
  | "definition"
  | "declaration"
  | "reference"
  | "import"
  | "export"
  | "read"
  | "write"
  | "call"
  | "override"
  | "implementation"
  | string;

export type SemanticIndexRelationPredicate =
  | "contains"
  | "defines"
  | "references"
  | "calls"
  | "imports"
  | "exports"
  | "implements"
  | "overrides"
  | "dependsOn"
  | "generatedFrom"
  | "frontierMapsTo"
  | string;

export interface SemanticIndexRepository {
  readonly rootUri?: string;
  readonly commit?: string;
  readonly workspace?: string;
  readonly metadata?: JsonObject;
}

export interface SemanticIndexDocument {
  readonly id: string;
  readonly path: string;
  readonly language: FrontierSourceLanguage;
  readonly sourceHash?: string;
  readonly nativeSourceId?: SemanticId;
  readonly metadata?: JsonObject;
}

export interface SemanticIndexSymbol {
  readonly id: string;
  readonly scheme?: "frontier" | "scip" | "lsif" | "glean" | "native" | string;
  readonly name: string;
  readonly kind: SemanticIndexSymbolKind;
  readonly language?: FrontierSourceLanguage;
  readonly semanticNodeId?: SemanticId;
  readonly nativeAstNodeId?: string;
  readonly signatureHash?: string;
  readonly definitionSpan?: SourceSpan;
  readonly metadata?: JsonObject;
}

export interface SemanticIndexOccurrence {
  readonly id: string;
  readonly documentId: string;
  readonly symbolId: string;
  readonly role: SemanticIndexOccurrenceRole;
  readonly span?: SourceSpan;
  readonly nativeAstNodeId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly metadata?: JsonObject;
}

export interface SemanticIndexRelation {
  readonly id: string;
  readonly sourceId: string;
  readonly predicate: SemanticIndexRelationPredicate;
  readonly targetId: string;
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface SemanticIndexFact {
  readonly id: string;
  readonly predicate: string;
  readonly subjectId: string;
  readonly objectId?: string;
  readonly value?: JsonValue;
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface SemanticIndexRecord {
  readonly kind: "frontier.lang.semanticIndex";
  readonly version: 1;
  readonly id: string;
  readonly repository?: SemanticIndexRepository;
  readonly documents: readonly SemanticIndexDocument[];
  readonly symbols: readonly SemanticIndexSymbol[];
  readonly occurrences: readonly SemanticIndexOccurrence[];
  readonly relations: readonly SemanticIndexRelation[];
  readonly facts: readonly SemanticIndexFact[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export declare function createNativeAstRecord(input: Omit<NativeAstRecord, "kind" | "version">): NativeAstRecord;

export declare function createSemanticIndexRecord(input: Omit<SemanticIndexRecord, "kind" | "version">): SemanticIndexRecord;

export declare function validateSemanticIndexRecord(index: SemanticIndexRecord): readonly string[];
