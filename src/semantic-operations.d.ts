import type { CompileTarget, FrontierSourceLanguage, JsonObject, SourceSpan } from "./base.js";
import type { SemanticMergeCandidateRecord, SemanticMergeReadiness } from "./merge-candidates.js";

export type SemanticOperationKind =
  | "declaration"
  | "expression"
  | "controlFlow"
  | "dataFlow"
  | "effect"
  | "type"
  | "memory"
  | "concurrency"
  | "macro"
  | "extern"
  | "runtime"
  | "projection"
  | "merge"
  | "proof"
  | "sourcePreservation"
  | "dialect"
  | "opaque"
  | string;

export interface SemanticOperationRecord {
  readonly kind: "frontier.lang.semanticOperation";
  readonly version: 1;
  readonly id: string;
  readonly operationKind: SemanticOperationKind;
  readonly language?: FrontierSourceLanguage | string;
  readonly name?: string;
  readonly target?: CompileTarget;
  readonly nativeSourceId?: string;
  readonly nativeAstId?: string;
  readonly nativeAstNodeIds: readonly string[];
  readonly semanticNodeIds: readonly string[];
  readonly semanticSymbolIds: readonly string[];
  readonly semanticOccurrenceIds: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceMapIds: readonly string[];
  readonly sourceMapMappingIds: readonly string[];
  readonly proofObligationIds: readonly string[];
  readonly proofArtifactIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly lossIds: readonly string[];
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  readonly effectIds: readonly string[];
  readonly resources: readonly string[];
  readonly ownershipKeys: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly readiness: SemanticMergeReadiness;
  readonly dynamic: boolean;
  readonly opaque: boolean;
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly payload?: unknown;
  readonly metadata: JsonObject;
}

export interface SemanticOperationRecordInput {
  readonly id?: string;
  readonly operationKind?: SemanticOperationKind;
  readonly op?: SemanticOperationKind;
  readonly language?: FrontierSourceLanguage | string;
  readonly name?: string;
  readonly target?: CompileTarget;
  readonly nativeSourceId?: string;
  readonly nativeAstId?: string;
  readonly nativeAstNodeId?: string;
  readonly nativeAstNodeIds?: readonly string[];
  readonly semanticNodeId?: string;
  readonly semanticNodeIds?: readonly string[];
  readonly semanticSymbolId?: string;
  readonly semanticSymbolIds?: readonly string[];
  readonly semanticOccurrenceId?: string;
  readonly semanticOccurrenceIds?: readonly string[];
  readonly sourceSpan?: SourceSpan;
  readonly sourceMapId?: string;
  readonly sourceMapIds?: readonly string[];
  readonly sourceMapMappingId?: string;
  readonly sourceMapMappingIds?: readonly string[];
  readonly proofObligationId?: string;
  readonly proofObligationIds?: readonly string[];
  readonly proofArtifactId?: string;
  readonly proofArtifactIds?: readonly string[];
  readonly evidenceId?: string;
  readonly evidenceIds?: readonly string[];
  readonly lossId?: string;
  readonly lossIds?: readonly string[];
  readonly reads?: readonly string[];
  readonly writes?: readonly string[];
  readonly effectId?: string;
  readonly effectIds?: readonly string[];
  readonly effects?: readonly string[];
  readonly resource?: string;
  readonly resources?: readonly string[];
  readonly ownerKey?: string;
  readonly ownershipKeys?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly readiness?: SemanticMergeReadiness;
  readonly dynamic?: boolean;
  readonly opaque?: boolean;
  readonly payload?: unknown;
  readonly metadata?: JsonObject;
}

export interface SemanticOperationSet {
  readonly kind: "frontier.lang.semanticOperationSet";
  readonly version: 1;
  readonly id: string;
  readonly operations: readonly SemanticOperationRecord[];
  readonly summary: SemanticOperationSetSummary;
  readonly metadata: JsonObject;
}

export interface SemanticOperationSetSummary {
  readonly operations: number;
  readonly byOperationKind: Readonly<Record<string, number>>;
  readonly languages: readonly string[];
  readonly semanticNodeIds: readonly string[];
  readonly nativeAstNodeIds: readonly string[];
  readonly effectIds: readonly string[];
  readonly ownershipKeys: readonly string[];
  readonly conflictKeys: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly lossIds: readonly string[];
  readonly proofObligationIds: readonly string[];
  readonly dynamicOperations: number;
  readonly opaqueOperations: number;
  readonly autoMergeClaims: number;
  readonly semanticEquivalenceClaims: number;
}

export interface SemanticOperationSetInput {
  readonly id?: string;
  readonly operations?: readonly SemanticOperationRecordInput[];
  readonly records?: readonly SemanticOperationRecordInput[];
  readonly metadata?: JsonObject;
}

export declare const SemanticOperationKinds: readonly SemanticOperationKind[];
export declare function createSemanticOperationRecord(input?: SemanticOperationRecordInput): SemanticOperationRecord;
export declare function createSemanticOperationSet(input?: SemanticOperationSetInput): SemanticOperationSet;
export declare function summarizeSemanticOperations(operations?: readonly SemanticOperationRecord[]): SemanticOperationSetSummary;
export declare function semanticOperationOwnershipKeys(operation?: Partial<SemanticOperationRecord>): readonly string[];
export declare function semanticOperationConflictKeys(operation?: Partial<SemanticOperationRecord>): readonly string[];
export declare function semanticOperationToMergeCandidate(
  operation: SemanticOperationRecord,
  input?: { readonly id?: string; readonly sourcePath?: string; readonly reasons?: readonly string[] }
): SemanticMergeCandidateRecord;
