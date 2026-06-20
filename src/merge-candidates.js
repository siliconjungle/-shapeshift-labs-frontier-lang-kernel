import { collectPatchEvidence, uniqueEvidence } from "./evidence.js";
import { collectNativeAstSubtreeConflictKeys, collectSemanticMergeConflictKeys, collectSemanticMergeNativeSpans, collectSemanticSignatureConflictKeys, collectSourceMapNativeSpans, collectSourceMapSemanticTouchIds, collectTouchedSemanticMergeNodes, collectTouchedSemanticMergeSymbols } from "./merge-anchors.js";
import { inferNativeAstMergeReadiness, inferSemanticMergeReadiness } from "./merge-readiness.js";
import { collectPatchSemanticTouchIds, emptyPatchSummary, summarizePatch } from "./patch-summary.js";
import { uniqueById } from "./shared.js";

export function createImportResult(input) {
  const result = {
    ...input,
    kind: "frontier.lang.importResult",
    version: 1,
    sourceMaps: input.sourceMaps ?? input.universalAst?.sourceMaps ?? [],
    losses: input.losses ?? [],
    evidence: input.evidence ?? []
  };
  return {
    ...result,
    mergeCandidates: input.mergeCandidates ?? (hasNativeImportMergeSurface(result)
      ? [createSemanticMergeCandidateFromImport({ importResult: result })]
      : [])
  };
}

export function createSemanticMergeCandidateRecord(input) {
  const touchedSymbols = input.touchedSymbols ?? [];
  const touchedSemanticNodes = input.touchedSemanticNodes ?? [];
  const nativeSpans = input.nativeSpans ?? [];
  const conflictKeys = input.conflictKeys ?? collectSemanticMergeConflictKeys({
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans
  });
  return {
    ...input,
    kind: "frontier.lang.semanticMergeCandidate",
    version: 1,
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans,
    conflictKeys,
    readiness: input.readiness ?? "needs-review",
    reasons: input.reasons ?? []
  };
}

export function createSemanticMergeCandidateFromImport(input) {
  const importResult = input.importResult;
  const patch = input.patch ?? importResult.patch;
  const document = input.document ?? importResult.document;
  const semanticIndex = input.semanticIndex ?? importResult.semanticIndex ?? importResult.universalAst?.semanticIndex;
  const nativeAst = input.nativeAst ?? importResult.nativeAst;
  const patchSummary = patch ? summarizePatch(patch) : emptyPatchSummary();
  const semanticTouchIds = collectPatchSemanticTouchIds(document, patchSummary);
  const touchedSymbols = collectTouchedSemanticMergeSymbols(semanticIndex, semanticTouchIds, !patch);
  const touchedSemanticNodes = collectTouchedSemanticMergeNodes(document, semanticIndex, touchedSymbols, semanticTouchIds, !patch);
  const nativeSpans = collectSemanticMergeNativeSpans({
    semanticIndex,
    nativeAst,
    touchedSymbols,
    semanticTouchIds,
    sourcePath: input.sourcePath ?? importResult.sourcePath ?? nativeAst?.sourcePath,
    language: input.language ?? importResult.language ?? nativeAst?.language,
    includeAll: !patch
  });
  const evidence = uniqueEvidence([
    ...(importResult.evidence ?? []),
    ...(patch ? collectPatchEvidence(patch) : []),
    ...(input.evidence ?? [])
  ]);
  const losses = uniqueById([
    ...(importResult.losses ?? []),
    ...(nativeAst?.losses ?? []),
    ...(importResult.universalAst?.losses ?? [])
  ]);
  const readiness = input.readiness
    ? { readiness: input.readiness, reasons: input.reasons ?? [] }
    : inferSemanticMergeReadiness({
      patch,
      patchSummary,
      evidence,
      losses,
      touchedSymbols,
      touchedSemanticNodes
    });

  return createSemanticMergeCandidateRecord({
    id: input.id ?? `merge-candidate:${importResult.id ?? patch?.id ?? semanticIndex?.id ?? nativeAst?.id ?? "unknown"}`,
    importResultId: importResult.id,
    patchId: patch?.id,
    language: input.language ?? importResult.language ?? nativeAst?.language,
    sourcePath: input.sourcePath ?? importResult.sourcePath ?? nativeAst?.sourcePath,
    baseHash: patch?.baseHash,
    targetHash: patch?.targetHash,
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans,
    conflictKeys: collectSemanticMergeConflictKeys({
      touchedSymbols,
      touchedSemanticNodes,
      nativeSpans,
      regions: patchSummary.regions,
      effects: patchSummary.effects
    }),
    readiness: readiness.readiness,
    reasons: readiness.reasons,
    evidence,
    metadata: mergeCandidateMetadata(importResult.metadata, input.metadata)
  });
}

export function createNativeAstMergeCandidate(input) {
  const semanticIndex = input.semanticIndex;
  const nativeAst = input.nativeAst;
  const sourceMaps = input.sourceMaps ?? [];
  const language = input.language ?? nativeAst?.language;
  const sourcePath = input.sourcePath ?? nativeAst?.sourcePath;
  const sourceMapTouchIds = collectSourceMapSemanticTouchIds(sourceMaps);
  const touchedSymbols = collectTouchedSemanticMergeSymbols(semanticIndex, sourceMapTouchIds, true);
  const touchedSemanticNodes = collectTouchedSemanticMergeNodes(input.document, semanticIndex, touchedSymbols, sourceMapTouchIds, false);
  const nativeSpans = uniqueById([
    ...collectSemanticMergeNativeSpans({
      semanticIndex,
      nativeAst,
      touchedSymbols,
      semanticTouchIds: sourceMapTouchIds,
      sourcePath,
      language,
      includeAll: true
    }),
    ...collectSourceMapNativeSpans(sourceMaps, { sourcePath, language })
  ]);
  const subtreeSummary = collectNativeAstSubtreeConflictKeys(nativeAst, {
    sourcePath,
    maxKeys: input.maxSubtreeKeys ?? 100
  });
  const signatureKeys = collectSemanticSignatureConflictKeys(semanticIndex, language);
  const evidence = uniqueEvidence(input.evidence ?? []);
  const losses = uniqueById([
    ...(input.losses ?? []),
    ...(nativeAst?.losses ?? [])
  ]);
  const readiness = input.readiness
    ? { readiness: input.readiness, reasons: input.reasons ?? [] }
    : inferNativeAstMergeReadiness({
      evidence,
      losses,
      touchedSymbols,
      touchedSemanticNodes,
      nativeSpans,
      subtreeSummary
    });

  return createSemanticMergeCandidateRecord({
    id: input.id ?? `merge-candidate:${nativeAst?.id ?? semanticIndex?.id ?? sourceMaps[0]?.id ?? "native-ast"}`,
    language,
    sourcePath,
    touchedSymbols,
    touchedSemanticNodes,
    nativeSpans,
    conflictKeys: collectSemanticMergeConflictKeys({
      touchedSymbols,
      touchedSemanticNodes,
      nativeSpans,
      extra: [
        ...subtreeSummary.conflictKeys,
        ...signatureKeys
      ]
    }),
    readiness: readiness.readiness,
    reasons: readiness.reasons,
    evidence,
    metadata: {
      source: "native-ast-merge-candidate",
      nativeAstId: nativeAst?.id,
      semanticIndexId: semanticIndex?.id,
      sourceMapIds: sourceMaps.map((sourceMap) => sourceMap.id),
      subtreeKeyCount: subtreeSummary.conflictKeys.length,
      duplicateSubtreeHashes: subtreeSummary.duplicateHashes,
      truncatedSubtreeKeys: subtreeSummary.truncated,
      signatureKeyCount: signatureKeys.length,
      ...(input.metadata ?? {})
    }
  });
}

function hasNativeImportMergeSurface(result) {
  return Boolean(result.patch || result.nativeAst || result.semanticIndex || result.universalAst?.semanticIndex);
}

function mergeCandidateMetadata(...records) {
  const metadata = {};
  for (const record of records) {
    if (record && typeof record === "object") {
      Object.assign(metadata, record);
    }
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}
