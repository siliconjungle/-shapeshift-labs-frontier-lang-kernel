import type { FrontierSourceLanguage, JsonObject } from "./base.js";
import type { EvidenceRecord } from "./evidence.js";

export type SourceRoundtripSegmentKind =
  | "whitespace"
  | "comment"
  | "stringLiteral"
  | "templateLiteral"
  | "decorator"
  | "importDeclaration"
  | "exportDeclaration"
  | "classDeclaration"
  | "functionDeclaration"
  | "interfaceDeclaration"
  | "typeAliasDeclaration"
  | "jsxishText"
  | "identifier"
  | "punctuation"
  | "text";

export type SourceRoundtripFeatureKind =
  | "whitespace"
  | "comment"
  | "templateLiteral"
  | "decorator"
  | "importDeclaration"
  | "exportDeclaration"
  | "classDeclaration"
  | "functionDeclaration"
  | "interfaceDeclaration"
  | "typeAliasDeclaration"
  | "overloadDeclaration"
  | "classMember"
  | "interfaceMember"
  | "objectLiteral"
  | "jsxishText"
  | "malformedSnippet"
  | "staleSnippet";

export type SourceNoopRoundtripClassification = "safe" | "lossy" | "failed";

export type SourceRoundtripDiagnosticKind = "malformed" | "stale" | "jsxish" | "emptySource" | string;

export type SourceRoundtripDiagnosticSeverity = "info" | "warning" | "error";

export interface SourceRoundtripSlice {
  readonly id: string;
  readonly kind: SourceRoundtripSegmentKind | SourceRoundtripFeatureKind;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly parentId?: string;
  readonly metadata?: JsonObject;
}

export interface SourceRoundtripDiagnostic {
  readonly id: string;
  readonly kind: SourceRoundtripDiagnosticKind;
  readonly severity: SourceRoundtripDiagnosticSeverity;
  readonly message: string;
  readonly start: number;
  readonly end: number;
  readonly featureId?: string;
}

export interface SourceRoundtripFeatureMetadata {
  readonly featureKinds: readonly string[];
  readonly lossyFeatureKinds: readonly string[];
  readonly diagnosticKinds: readonly string[];
  readonly diagnosticCount: number;
  readonly warningCount: number;
  readonly syntaxBalanced: boolean;
  readonly staleMarkerCount: number;
  readonly sourceBytePreservation: "segment-complete" | string;
}

export interface SourceRoundtripInput {
  readonly id?: string;
  readonly path?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourceText: string;
  readonly sourceHash?: string;
  readonly metadata?: JsonObject;
}

export interface SourceRoundtripScan {
  readonly kind: "frontier.lang.sourceRoundtripScan";
  readonly version: 1;
  readonly id: string;
  readonly path?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourceHash: string;
  readonly sourceLength: number;
  readonly segments: readonly SourceRoundtripSlice[];
  readonly features: readonly SourceRoundtripSlice[];
  readonly featureSummary: Readonly<Record<string, number>>;
  readonly featureMetadata: SourceRoundtripFeatureMetadata;
  readonly diagnostics: readonly SourceRoundtripDiagnostic[];
  readonly metadata?: JsonObject;
}

export interface SourceRoundtripDifference {
  readonly offset: number;
  readonly sourceChar: string;
  readonly reconstructedChar: string;
  readonly sourceCode: number | null;
  readonly reconstructedCode: number | null;
  readonly sourcePreview: string;
  readonly reconstructedPreview: string;
}

export interface VerifyNoopSourceRoundtripInput extends SourceRoundtripInput {
  readonly scan?: SourceRoundtripScan;
  readonly reportId?: string;
  readonly evidenceId?: string;
  readonly reconstructedText?: string;
}

export interface SourceNoopRoundtripReport {
  readonly kind: "frontier.lang.sourceNoopRoundtripReport";
  readonly version: 1;
  readonly id: string;
  readonly status: "passed" | "failed";
  readonly scan: SourceRoundtripScan;
  readonly sourceHash: string;
  readonly reconstructedHash: string;
  readonly sourceLength: number;
  readonly reconstructedLength: number;
  readonly issues: readonly string[];
  readonly featureSummary: Readonly<Record<string, number>>;
  readonly featureMetadata: SourceRoundtripFeatureMetadata;
  readonly diagnostics: readonly SourceRoundtripDiagnostic[];
  readonly classification: SourceNoopRoundtripClassification;
  readonly classificationReasons: readonly string[];
  readonly firstDifference?: SourceRoundtripDifference;
  readonly evidence: EvidenceRecord;
}

export declare function scanSourceRoundtrip(input: SourceRoundtripInput | string): SourceRoundtripScan;

export declare function reconstructSourceRoundtrip(scan: SourceRoundtripScan): string;

export declare function verifyNoopSourceRoundtrip(
  input: VerifyNoopSourceRoundtripInput | string,
  options?: {
    readonly id?: string;
    readonly evidenceId?: string;
    readonly reconstructedText?: string;
  }
): SourceNoopRoundtripReport;
