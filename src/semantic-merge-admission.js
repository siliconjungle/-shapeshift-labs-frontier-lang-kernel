import { uniqueEvidence } from "./evidence.js";
import { collectNativeAstSubtreeConflictKeys, collectSemanticSignatureConflictKeys } from "./merge-anchors.js";
import { ordinalCompare, unique, uniqueById } from "./shared.js";

export const SEMANTIC_MERGE_ADMISSION_CLASSIFICATIONS = Object.freeze([
  "safe",
  "safe-with-losses",
  "review-required",
  "blocked"
]);

export const SEMANTIC_MERGE_ADMISSION_CONFLICT_KEY_KINDS = Object.freeze([
  "symbol",
  "semantic-node",
  "region",
  "native-span",
  "source-subtree",
  "effect",
  "generated-output",
  "signature",
  "custom"
]);

export const SEMANTIC_MERGE_DYNAMIC_EFFECTS = Object.freeze([
  "dynamic",
  "eval",
  "unsafeEval",
  "ffi",
  "reflection",
  "proxy"
]);

export function semanticMergeGeneratedOutputConflictKey(generatedSpan, context = {}) {
  const sourceMap = context.sourceMap;
  const mapping = context.mapping;
  const target = generatedSpan?.target ?? mapping?.target ?? sourceMap?.target;
  const path = generatedSpan?.targetPath ?? generatedSpan?.path ?? sourceMap?.targetPath ?? target?.emitPath ?? "unknown";
  const stableId = context.stableId ??
    mapping?.nativeAstNodeId ??
    mapping?.semanticNodeId ??
    mapping?.semanticSymbolId ??
    mapping?.id ??
    generatedSpan?.generatedName ??
    "unknown";
  return [
    "generated",
    path,
    generatedSpan?.startLine ?? generatedSpan?.start ?? "",
    generatedSpan?.startColumn ?? "",
    generatedSpan?.endLine ?? generatedSpan?.end ?? "",
    generatedSpan?.endColumn ?? "",
    stableId,
    target?.language ?? "",
    target?.platform ?? ""
  ].map(conflictKeyPart).join(":");
}

export function collectSemanticMergeAdmissionConflictKeys(candidate, options = {}) {
  const keys = [
    ...stringList(candidate?.conflictKeys),
    ...stringList(options.extraConflictKeys),
    ...metadataStringList(candidate, "conflictKeys"),
    ...metadataStringList(candidate, "generatedOutputConflictKeys"),
    ...metadataStringList(candidate, "sourceSubtreeConflictKeys")
  ];

  for (const symbol of candidate?.touchedSymbols ?? []) {
    keys.push(symbol.conflictKey ?? `symbol:${symbol.id}`);
  }
  for (const node of candidate?.touchedSemanticNodes ?? []) {
    keys.push(node.conflictKey ?? `node:${node.id}`);
  }
  for (const span of candidate?.nativeSpans ?? []) {
    keys.push(span.conflictKey ?? nativeSpanAdmissionConflictKey(span.span, span.nativeAstNodeId ?? span.id));
    if (span.metadata?.generatedSpan && typeof span.metadata.generatedSpan === "object") {
      keys.push(semanticMergeGeneratedOutputConflictKey(span.metadata.generatedSpan, {
        stableId: span.nativeAstNodeId ?? span.semanticNodeId ?? span.symbolId ?? span.id
      }));
    }
  }

  for (const region of [...stringIdList(options.regions), ...metadataStringList(candidate, "regions")]) {
    keys.push(`region:${region}`);
  }
  for (const effect of [...stringIdList(options.effects), ...metadataStringList(candidate, "effects")]) {
    keys.push(`effect:${effect}`);
  }
  if (options.nativeAst) {
    keys.push(...collectNativeAstSubtreeConflictKeys(options.nativeAst, {
      sourcePath: options.sourcePath ?? candidate?.sourcePath,
      maxKeys: options.maxSubtreeKeys ?? 100
    }).conflictKeys);
  }
  if (options.semanticIndex) {
    keys.push(...collectSemanticSignatureConflictKeys(options.semanticIndex, candidate?.language));
  }
  for (const sourceMap of options.sourceMaps ?? []) {
    for (const mapping of sourceMap.mappings ?? []) {
      if (mapping.generatedSpan && generatedMappingMatchesCandidate(candidate, mapping, options)) {
        keys.push(semanticMergeGeneratedOutputConflictKey(mapping.generatedSpan, { sourceMap, mapping }));
      }
    }
  }
  for (const generatedSpan of options.generatedSpans ?? []) {
    keys.push(semanticMergeGeneratedOutputConflictKey(generatedSpan));
  }
  return unique(keys.filter((key) => typeof key === "string" && key.length > 0)).sort(ordinalCompare);
}

export function semanticMergeConflictKeyKind(conflictKey) {
  if (conflictKey.startsWith("symbol:")) return "symbol";
  if (conflictKey.startsWith("node:")) return "semantic-node";
  if (conflictKey.startsWith("region:")) return "region";
  if (conflictKey.startsWith("native:")) return "native-span";
  if (conflictKey.startsWith("ast-subtree:") || conflictKey.startsWith("source-subtree:")) return "source-subtree";
  if (conflictKey.startsWith("effect:")) return "effect";
  if (conflictKey.startsWith("generated:") || conflictKey.startsWith("generated-output:")) return "generated-output";
  if (conflictKey.startsWith("sig:")) return "signature";
  return "custom";
}

export function collectSemanticMergeConflictKeyKinds(conflictKeys) {
  return unique(conflictKeys.map((key) => semanticMergeConflictKeyKind(key))).sort(ordinalCompare);
}

export function classifySemanticMergeCandidate(input, options = {}) {
  const { candidate, admissionOptions } = normalizeAdmissionInput(input, options);
  const conflictKeys = collectSemanticMergeAdmissionConflictKeys(candidate, admissionOptions);
  const conflictKeyKinds = collectSemanticMergeConflictKeyKinds(conflictKeys);
  const evidence = uniqueEvidence([
    ...(candidate?.evidence ?? []),
    ...(admissionOptions.evidence ?? []),
    ...(admissionOptions.sourceMaps ?? []).flatMap((sourceMap) => sourceMap.evidence ?? [])
  ]);
  const losses = uniqueById(admissionOptions.losses ?? []);
  const failedEvidence = evidence.filter((record) => record.status === "failed");
  const unknownEvidence = evidence.filter((record) => record.status === "unknown");
  const passedEvidence = evidence.filter((record) => record.status === "passed");
  const errorLosses = losses.filter((record) => record.severity === "error");
  const nonBlockingLosses = losses.filter((record) => record.severity !== "error");
  const requiredKinds = unique(admissionOptions.requiredConflictKeyKinds ?? []);
  const missingKinds = requiredKinds.filter((kind) => !conflictKeyKinds.includes(kind));
  const effectKeys = conflictKeys.filter((key) => semanticMergeConflictKeyKind(key) === "effect");
  const dynamicEffectKeys = effectKeys.filter((key) => SEMANTIC_MERGE_DYNAMIC_EFFECTS.includes(key.slice("effect:".length)));
  const blockers = [];
  const review = [];
  const notes = [];

  if (!candidate) blockers.push("No merge candidate was supplied.");
  if (failedEvidence.length > 0) blockers.push(`Failed evidence prevents admission: ${failedEvidence.map((record) => record.id).join(", ")}`);
  if (candidate?.readiness === "blocked") blockers.push("Candidate readiness is blocked.");
  if (errorLosses.length > 0) blockers.push(`Blocking native loss(es) require repair: ${errorLosses.map((record) => record.id).join(", ")}`);
  if (conflictKeys.length === 0) review.push("Candidate has no stable semantic merge conflict keys.");
  if (missingKinds.length > 0) review.push(`Candidate is missing required conflict key kind(s): ${missingKinds.join(", ")}`);
  if (admissionOptions.opaque || candidate?.metadata?.opaque === true || candidate?.metadata?.dynamic === true) {
    review.push("Candidate is marked opaque or dynamic and must not be auto-merged.");
  }
  if (dynamicEffectKeys.length > 0) review.push(`Dynamic effect conflict key(s) require review: ${dynamicEffectKeys.join(", ")}`);
  else if (effectKeys.length > 0) review.push(`Effect conflict key(s) require review: ${effectKeys.join(", ")}`);
  if (unknownEvidence.length > 0) review.push(`Unknown evidence requires review: ${unknownEvidence.map((record) => record.id).join(", ")}`);
  if (candidate?.readiness === "needs-review" || candidate?.readiness === "review-required") {
    review.push("Candidate readiness requires review.");
  }
  if (nonBlockingLosses.length > 0 || candidate?.readiness === "ready-with-losses" || candidate?.readiness === "safe-with-losses") {
    notes.push(`Non-blocking loss evidence is present: ${nonBlockingLosses.map((record) => record.id).join(", ") || "candidate readiness"}`);
  }
  if (passedEvidence.length > 0) notes.push(`Passed evidence supports admission: ${passedEvidence.map((record) => record.id).join(", ")}`);
  if (conflictKeyKinds.length > 0) notes.push(`Stable conflict keys cover: ${conflictKeyKinds.join(", ")}`);

  const classification = blockers.length > 0
    ? "blocked"
    : review.length > 0
      ? "review-required"
      : notes.some((reason) => reason.startsWith("Non-blocking loss"))
        ? "safe-with-losses"
        : "safe";

  return {
    kind: "frontier.lang.semanticMergeAdmission",
    version: 1,
    id: admissionOptions.id ?? `merge-admission:${candidate?.id ?? "unknown"}`,
    candidateId: candidate?.id,
    classification,
    autoMergeable: classification === "safe",
    conflictKeys,
    conflictKeyKinds,
    reasons: unique([...blockers, ...review, ...notes, ...(candidate?.reasons ?? []).map((reason) => `Candidate reason: ${reason}`)]),
    evidence,
    losses,
    metadata: {
      candidateReadiness: candidate?.readiness,
      requiredConflictKeyKinds: requiredKinds,
      missingRequiredConflictKeyKinds: missingKinds,
      ...(admissionOptions.metadata ?? {})
    }
  };
}

export function createSemanticMergeAdmissionRecord(input, options = {}) {
  return classifySemanticMergeCandidate(input, options);
}

function normalizeAdmissionInput(input, options) {
  if (input && Object.hasOwn(input, "candidate")) {
    const { candidate, ...inlineOptions } = input;
    return { candidate, admissionOptions: { ...options, ...inlineOptions } };
  }
  return { candidate: input, admissionOptions: options };
}

function generatedMappingMatchesCandidate(candidate, mapping, options) {
  if (options.includeAllGeneratedMappings) return true;
  if (mapping.mergeCandidateId && candidate?.id && mapping.mergeCandidateId === candidate.id) return true;
  const symbolIds = new Set((candidate?.touchedSymbols ?? []).map((symbol) => symbol.id));
  const semanticNodeIds = new Set((candidate?.touchedSemanticNodes ?? []).map((node) => node.id));
  const nativeAstNodeIds = new Set([
    ...(candidate?.touchedSymbols ?? []).map((symbol) => symbol.nativeAstNodeId),
    ...(candidate?.nativeSpans ?? []).map((span) => span.nativeAstNodeId)
  ].filter(Boolean));
  return Boolean(
    (mapping.semanticSymbolId && symbolIds.has(mapping.semanticSymbolId)) ||
    (mapping.semanticNodeId && semanticNodeIds.has(mapping.semanticNodeId)) ||
    (mapping.nativeAstNodeId && nativeAstNodeIds.has(mapping.nativeAstNodeId))
  );
}

function nativeSpanAdmissionConflictKey(span, stableId) {
  return [
    "native",
    span?.path ?? span?.sourceId ?? "unknown",
    span?.startLine ?? span?.start ?? "",
    span?.startColumn ?? "",
    span?.endLine ?? span?.end ?? "",
    span?.endColumn ?? "",
    stableId ?? "unknown"
  ].map(conflictKeyPart).join(":");
}

function metadataStringList(candidate, key) {
  return stringIdList(candidate?.metadata?.[key]);
}

function stringList(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === "string" && value.length > 0) : [];
}

function stringIdList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => typeof value === "string" ? value : value && typeof value === "object" ? value.id : undefined)
    .filter(Boolean);
}

function conflictKeyPart(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ");
}
