

export type NativeAstLossKind =
  | "unsupportedSyntax"
  | "unsupportedSemantic"
  | "opaqueNative"
  | "missingTypeInfo"
  | "macroExpansion"
  | "preprocessor"
  | "dynamicRuntime"
  | "unresolvedSymbol"
  | "nonRoundTrippable"
  | "declarationOnlyCoverage"
  | "partialSemanticIndex"
  | "sourceMapApproximation"
  | "sourcePreservation"
  | "conditionalCompilation"
  | "reflection"
  | "macroHygiene"
  | "unsafeFfi"
  | "dynamicDispatch"
  | "generatedCode"
  | "targetLowering"
  | string;

export declare const NativeAstLossKinds: readonly NativeAstLossKind[];

export type SourceMapPrecision = "exact" | "declaration" | "line" | "estimated" | "unknown" | string;

export declare const SourceMapPrecisions: readonly SourceMapPrecision[];

export type SourcePreservationLevel = "exact" | "declaration" | "estimated" | "blocked" | string;

export declare const SourcePreservationLevels: readonly SourcePreservationLevel[];

export type UniversalAstLayerName =
  | "losslessSource"
  | "cst"
  | "semanticSymbols"
  | "effects"
  | "controlFlow"
  | "dataFlow"
  | "proofSpec"
  | "paradigmSemantics"
  | "runtimeModel"
  | "projectionEvidence"
  | "mergeEvidence"
  | string;

export declare const UniversalAstLayerNames: readonly UniversalAstLayerName[];

export type UniversalAstReferenceKind =
  | "layer"
  | "nativeSource"
  | "nativeAst"
  | "nativeAstNode"
  | "semanticNode"
  | "semanticIndex"
  | "semanticSymbol"
  | "semanticOccurrence"
  | "semanticRelation"
  | "semanticFact"
  | "sourceMap"
  | "sourceMapMapping"
  | "mergeCandidate"
  | "proofContract"
  | "proofObligation"
  | "proofArtifact"
  | "proofAssumption"
  | "paradigmRecord"
  | "loss"
  | "evidence"
  | "effect"
  | string;

export declare const UniversalAstReferenceKinds: readonly UniversalAstReferenceKind[];

export type ProofSpecContractKind =
  | "precondition"
  | "postcondition"
  | "assertion"
  | "frame"
  | "refinement"
  | "invariant"
  | "termination"
  | "temporal"
  | "assumption"
  | string;

export declare const ProofSpecContractKinds: readonly ProofSpecContractKind[];

export type ProofObligationStatus = "open" | "discharged" | "failed" | "unknown" | "stale" | "assumed" | string;

export declare const ProofObligationStatuses: readonly ProofObligationStatus[];

export type ProofArtifactKind = "solverRun" | "proofScript" | "modelCheck" | "counterexample" | "certificate" | "manualReview" | "testEvidence" | string;

export declare const ProofArtifactKinds: readonly ProofArtifactKind[];

export type ParadigmSemanticsRecordGroup =
  | "bindingScopes"
  | "bindings"
  | "patterns"
  | "typeConstraints"
  | "evaluationModels"
  | "memoryLocations"
  | "effectRegions"
  | "controlRegions"
  | "logicPrograms"
  | "actorSystems"
  | "stackEffects"
  | "arrayShapes"
  | "numericKernels"
  | "dataflowNetworks"
  | "clockModels"
  | "objectModels"
  | "macroExpansions"
  | "reflectionBoundaries"
  | "loweringRecords";

export declare const ParadigmSemanticsRecordGroups: readonly ParadigmSemanticsRecordGroup[];
