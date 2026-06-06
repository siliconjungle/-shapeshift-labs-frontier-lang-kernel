import type { EvidenceRecord } from "./evidence.js";
import type { JsonObject, JsonValue, SemanticId, SourceSpan } from "./base.js";
import type { NativeAstLossRecord, NativeAstRecord, SemanticIndexRecord } from "./source-records.js";
import type { SourceMapGeneratedSpan, SourceMapRecord } from "./source-maps.js";
import type { ParadigmSemanticsRecordGroup } from "./constants.js";
import type { FrontierLangDocument, NativeSourceNode } from "./document.js";
import type { ProofSubjectKind } from "./proof-spec.js";
import type { SemanticMergeCandidateRecord } from "./merge-candidates.js";
import type { FrontierUniversalAstEnvelope } from "./universal-ast.js";

export type ParadigmSemanticSubjectKind =
  | ProofSubjectKind
  | "semanticRelation"
  | "semanticFact"
  | string;

export interface ParadigmSemanticRecord {
  readonly id: string;
  readonly kind: string;
  readonly subjectKind?: ParadigmSemanticSubjectKind;
  readonly subjectId?: string;
  readonly semanticNodeId?: SemanticId;
  readonly semanticSymbolId?: string;
  readonly semanticOccurrenceId?: string;
  readonly nativeSourceId?: SemanticId;
  readonly nativeAstId?: string;
  readonly nativeAstNodeId?: string;
  readonly sourceMapId?: string;
  readonly sourceMapMappingId?: string;
  readonly sourceSpan?: SourceSpan;
  readonly generatedSpan?: SourceMapGeneratedSpan;
  readonly effectIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly lossIds?: readonly string[];
  readonly relatedRecordIds?: readonly string[];
  readonly bindingScopeId?: string;
  readonly parentScopeId?: string;
  readonly bindingId?: string;
  readonly patternId?: string;
  readonly typeConstraintId?: string;
  readonly evaluationModelId?: string;
  readonly memoryLocationId?: string;
  readonly effectRegionId?: string;
  readonly controlRegionId?: string;
  readonly logicProgramId?: string;
  readonly actorSystemId?: string;
  readonly stackEffectId?: string;
  readonly arrayShapeId?: string;
  readonly numericKernelId?: string;
  readonly dataflowNetworkId?: string;
  readonly clockModelId?: string;
  readonly objectModelId?: string;
  readonly macroExpansionId?: string;
  readonly reflectionBoundaryId?: string;
  readonly loweringRecordId?: string;
  readonly sourceRecordId?: string;
  readonly targetRecordId?: string;
  readonly [key: string]: JsonValue | SourceSpan | SourceMapGeneratedSpan | readonly string[] | undefined;
}

export interface FrontierParadigmSemanticsLayer {
  readonly kind: "frontier.lang.paradigmSemantics";
  readonly version: 1;
  readonly id: string;
  readonly bindingScopes: readonly ParadigmSemanticRecord[];
  readonly bindings: readonly ParadigmSemanticRecord[];
  readonly patterns: readonly ParadigmSemanticRecord[];
  readonly typeConstraints: readonly ParadigmSemanticRecord[];
  readonly evaluationModels: readonly ParadigmSemanticRecord[];
  readonly memoryLocations: readonly ParadigmSemanticRecord[];
  readonly effectRegions: readonly ParadigmSemanticRecord[];
  readonly controlRegions: readonly ParadigmSemanticRecord[];
  readonly logicPrograms: readonly ParadigmSemanticRecord[];
  readonly actorSystems: readonly ParadigmSemanticRecord[];
  readonly stackEffects: readonly ParadigmSemanticRecord[];
  readonly arrayShapes: readonly ParadigmSemanticRecord[];
  readonly numericKernels: readonly ParadigmSemanticRecord[];
  readonly dataflowNetworks: readonly ParadigmSemanticRecord[];
  readonly clockModels: readonly ParadigmSemanticRecord[];
  readonly objectModels: readonly ParadigmSemanticRecord[];
  readonly macroExpansions: readonly ParadigmSemanticRecord[];
  readonly reflectionBoundaries: readonly ParadigmSemanticRecord[];
  readonly loweringRecords: readonly ParadigmSemanticRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export type ParadigmSemanticsLayerInput = {
  readonly id?: string;
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
} & Partial<Record<ParadigmSemanticsRecordGroup, readonly ParadigmSemanticRecord[]>>;

export declare function createParadigmSemanticsLayer(input?: ParadigmSemanticsLayerInput | FrontierParadigmSemanticsLayer): FrontierParadigmSemanticsLayer;

export declare function validateParadigmSemanticsLayer(paradigmSemantics: FrontierParadigmSemanticsLayer, context?: {
  readonly envelope?: FrontierUniversalAstEnvelope;
  readonly document?: FrontierLangDocument;
  readonly nativeSources?: readonly NativeSourceNode[];
  readonly nativeAst?: NativeAstRecord;
  readonly semanticIndex?: SemanticIndexRecord;
  readonly sourceMaps?: readonly SourceMapRecord[];
  readonly mergeCandidates?: readonly SemanticMergeCandidateRecord[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly paradigmSemantics?: FrontierParadigmSemanticsLayer;
  readonly strict?: boolean;
}): readonly string[];
