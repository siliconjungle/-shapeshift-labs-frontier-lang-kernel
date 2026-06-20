import type { FrontierSourceLanguage, JsonObject } from "./base.js";
import type { EvidenceRecord } from "./evidence.js";

export type SourceRoundtripSegmentKind =
  | "whitespace"
  | "comment"
  | "stringLiteral"
  | "templateLiteral"
  | "importDeclaration"
  | "exportDeclaration"
  | "classDeclaration"
  | "interfaceDeclaration"
  | "identifier"
  | "punctuation"
  | "text";

export type SourceRoundtripFeatureKind =
  | "whitespace"
  | "comment"
  | "templateLiteral"
  | "importDeclaration"
  | "exportDeclaration"
  | "classDeclaration"
  | "interfaceDeclaration"
  | "classMember"
  | "interfaceMember";

export interface SourceRoundtripSlice {
  readonly id: string;
  readonly kind: SourceRoundtripSegmentKind | SourceRoundtripFeatureKind;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly parentId?: string;
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
