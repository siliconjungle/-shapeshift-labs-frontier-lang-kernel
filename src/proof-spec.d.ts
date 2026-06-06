import type { EvidenceRecord } from "./evidence.js";
import type { FrontierSourceLanguage, JsonObject, JsonValue, SourceSpan } from "./base.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexRecord } from "./source-records.js";
import type { SourceMapGeneratedSpan, SourceMapRecord } from "./source-maps.js";
import type { ProofArtifactKind, ProofObligationStatus, ProofSpecContractKind } from "./constants.js";
import type { FrontierLangDocument, NativeSourceNode } from "./document.js";
import type { SemanticMergeCandidateRecord } from "./merge-candidates.js";
import type { FrontierUniversalAstEnvelope } from "./universal-ast.js";

export type ProofSubjectKind =
  | "semanticNode"
  | "semanticSymbol"
  | "semanticOccurrence"
  | "nativeSource"
  | "nativeAst"
  | "nativeAstNode"
  | "sourceMap"
  | "sourceMapMapping"
  | "semanticOperation"
  | "effect"
  | string;

export interface ProofSpecRecordBase {
  readonly id: string;
  readonly kind: ProofSpecContractKind | string;
  readonly subjectKind?: ProofSubjectKind;
  readonly subjectId?: string;
  readonly expression?: string;
  readonly statement?: string;
  readonly language?: FrontierSourceLanguage | string;
  readonly sourceSpan?: SourceSpan;
  readonly generatedSpan?: SourceMapGeneratedSpan;
  readonly sourceMapId?: string;
  readonly sourceMapMappingId?: string;
  readonly evidenceIds?: readonly string[];
  readonly lossIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface ProofContractRecord extends ProofSpecRecordBase {
  readonly kind: ProofSpecContractKind;
  readonly frame?: {
    readonly reads?: readonly string[];
    readonly writes?: readonly string[];
    readonly effects?: readonly string[];
  };
}

export interface ProofObligationRecord extends Omit<ProofSpecRecordBase, "kind"> {
  readonly kind: "contract" | "refinement" | "invariant" | "termination" | "temporal" | "projection" | "merge" | string;
  readonly status: ProofObligationStatus;
  readonly contractIds?: readonly string[];
  readonly assumptionIds?: readonly string[];
  readonly artifactIds?: readonly string[];
  readonly solver?: string;
  readonly dischargedAt?: number;
  readonly staleAgainstHash?: string;
}

export interface ProofArtifactRecord {
  readonly id: string;
  readonly kind: ProofArtifactKind;
  readonly status?: ProofObligationStatus;
  readonly path?: string;
  readonly hash?: string;
  readonly command?: string;
  readonly prover?: string;
  readonly obligationIds?: readonly string[];
  readonly assumptionIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly summary?: string;
  readonly data?: JsonValue;
  readonly metadata?: JsonObject;
}

export interface ProofAssumptionRecord {
  readonly id: string;
  readonly scope: "toolchain" | "compiler" | "runtime" | "host" | "hardware" | "foreignCode" | "humanReview" | string;
  readonly subjectKind?: ProofSubjectKind;
  readonly subjectId?: string;
  readonly description?: string;
  readonly evidenceIds?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface FrontierProofSpecLayer {
  readonly kind: "frontier.lang.proofSpec";
  readonly version: 1;
  readonly id: string;
  readonly contracts: readonly ProofContractRecord[];
  readonly refinements: readonly ProofContractRecord[];
  readonly invariants: readonly ProofContractRecord[];
  readonly termination: readonly ProofContractRecord[];
  readonly temporal: readonly ProofContractRecord[];
  readonly obligations: readonly ProofObligationRecord[];
  readonly artifacts: readonly ProofArtifactRecord[];
  readonly assumptions: readonly ProofAssumptionRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export interface ProofSpecLayerInput {
  readonly id?: string;
  readonly contracts?: readonly ProofContractRecord[];
  readonly refinements?: readonly ProofContractRecord[];
  readonly invariants?: readonly ProofContractRecord[];
  readonly termination?: readonly ProofContractRecord[];
  readonly temporal?: readonly ProofContractRecord[];
  readonly obligations?: readonly ProofObligationRecord[];
  readonly artifacts?: readonly ProofArtifactRecord[];
  readonly assumptions?: readonly ProofAssumptionRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export declare function createProofSpecLayer(input?: ProofSpecLayerInput | FrontierProofSpecLayer): FrontierProofSpecLayer;

export declare function validateProofSpecLayer(proof: FrontierProofSpecLayer, context?: {
  readonly envelope?: FrontierUniversalAstEnvelope;
  readonly document?: FrontierLangDocument;
  readonly nativeSources?: readonly NativeSourceNode[];
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly proof?: FrontierProofSpecLayer;
  readonly strict?: boolean;
}): readonly string[];
