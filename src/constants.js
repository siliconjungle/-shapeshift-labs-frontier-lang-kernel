

export const NativeAstLossKinds = Object.freeze([
  "unsupportedSyntax",
  "unsupportedSemantic",
  "opaqueNative",
  "missingTypeInfo",
  "macroExpansion",
  "preprocessor",
  "dynamicRuntime",
  "unresolvedSymbol",
  "nonRoundTrippable",
  "declarationOnlyCoverage",
  "partialSemanticIndex",
  "sourceMapApproximation",
  "sourcePreservation",
  "conditionalCompilation",
  "reflection",
  "macroHygiene",
  "unsafeFfi",
  "dynamicDispatch",
  "generatedCode",
  "targetLowering"
]);

export const SourceMapPrecisions = Object.freeze([
  "exact",
  "declaration",
  "line",
  "estimated",
  "unknown"
]);

export const SourcePreservationLevels = Object.freeze([
  "exact",
  "declaration",
  "estimated",
  "blocked"
]);

export const UniversalAstLayerNames = Object.freeze([
  "losslessSource",
  "cst",
  "semanticSymbols",
  "effects",
  "controlFlow",
  "dataFlow",
  "proofSpec",
  "paradigmSemantics",
  "runtimeModel",
  "projectionEvidence",
  "mergeEvidence"
]);

export const UniversalAstReferenceKinds = Object.freeze([
  "layer",
  "nativeSource",
  "nativeAst",
  "nativeAstNode",
  "semanticNode",
  "semanticIndex",
  "semanticSymbol",
  "semanticOccurrence",
  "semanticRelation",
  "semanticFact",
  "sourceMap",
  "sourceMapMapping",
  "mergeCandidate",
  "proofContract",
  "proofObligation",
  "proofArtifact",
  "proofAssumption",
  "paradigmRecord",
  "loss",
  "evidence",
  "effect"
]);

export const ProofSpecContractKinds = Object.freeze([
  "precondition",
  "postcondition",
  "assertion",
  "frame",
  "refinement",
  "invariant",
  "termination",
  "temporal",
  "assumption"
]);

export const ProofObligationStatuses = Object.freeze([
  "open",
  "discharged",
  "failed",
  "unknown",
  "stale",
  "assumed"
]);

export const ProofArtifactKinds = Object.freeze([
  "solverRun",
  "proofScript",
  "modelCheck",
  "counterexample",
  "certificate",
  "manualReview",
  "testEvidence"
]);

export const ParadigmSemanticsRecordGroups = Object.freeze([
  "bindingScopes",
  "bindings",
  "patterns",
  "typeConstraints",
  "evaluationModels",
  "memoryLocations",
  "effectRegions",
  "controlRegions",
  "logicPrograms",
  "actorSystems",
  "stackEffects",
  "arrayShapes",
  "numericKernels",
  "dataflowNetworks",
  "clockModels",
  "objectModels",
  "macroExpansions",
  "reflectionBoundaries",
  "loweringRecords"
]);

export const ParadigmSemanticsRecordPrefixes = Object.freeze({
  bindingScopes: "bindingScope",
  bindings: "binding",
  patterns: "pattern",
  typeConstraints: "typeConstraint",
  evaluationModels: "evaluationModel",
  memoryLocations: "memoryLocation",
  effectRegions: "effectRegion",
  controlRegions: "controlRegion",
  logicPrograms: "logicProgram",
  actorSystems: "actorSystem",
  stackEffects: "stackEffect",
  arrayShapes: "arrayShape",
  numericKernels: "numericKernel",
  dataflowNetworks: "dataflowNetwork",
  clockModels: "clockModel",
  objectModels: "objectModel",
  macroExpansions: "macroExpansion",
  reflectionBoundaries: "reflectionBoundary",
  loweringRecords: "loweringRecord"
});
