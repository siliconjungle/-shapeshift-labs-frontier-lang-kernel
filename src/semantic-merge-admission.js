import { uniqueEvidence } from "./evidence.js";
import { collectNativeAstSubtreeConflictKeys, collectSemanticSignatureConflictKeys } from "./merge-anchors.js";
import { intersection, ordinalCompare, unique, uniqueById } from "./shared.js";

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
  "source-preservation",
  "source-subtree",
  "effect",
  "generated-output",
  "signature",
  "custom"
]);

export const JS_TS_SEMANTIC_MERGE_SAFE_CONTRACT_KINDS = Object.freeze([
  "import",
  "declaration",
  "member"
]);

export const JS_TS_SEMANTIC_MERGE_REQUIRED_CONFLICT_KEY_KINDS = Object.freeze([
  "symbol",
  "region",
  "native-span",
  "source-preservation"
]);

export const SEMANTIC_MERGE_ADMISSION_CONFLICT_REASON_CODES = Object.freeze([
  "semantic-merge.no-candidate",
  "semantic-merge.failed-evidence",
  "semantic-merge.readiness-blocked",
  "semantic-merge.blocking-loss",
  "semantic-merge.missing-conflict-keys",
  "semantic-merge.missing-required-kind",
  "semantic-merge.opaque-or-dynamic",
  "semantic-merge.dynamic-effect",
  "semantic-merge.effect-boundary",
  "semantic-merge.unknown-evidence",
  "semantic-merge.readiness-review",
  "semantic-merge.non-blocking-loss",
  "semantic-merge.competing-candidate",
  "semantic-merge.external-conflict"
]);

export const SEMANTIC_MERGE_DYNAMIC_EFFECTS = Object.freeze([
  "dynamic",
  "eval",
  "unsafeEval",
  "ffi",
  "reflection",
  "proxy"
]);

const SEMANTIC_MERGE_CONFLICT_SEVERITY_ORDER = Object.freeze({
  error: 0,
  warning: 1,
  info: 2
});

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

export function semanticMergeSourcePreservationConflictKey(sourcePreservation, context = {}) {
  const sourceMap = context.sourceMap;
  const mapping = context.mapping;
  const sourceMapId = sourcePreservation?.sourceMapId ?? sourceMap?.id ?? "unknown";
  const mappingId = sourcePreservation?.sourceMapMappingId ?? mapping?.id ?? "unknown";
  const level = sourcePreservation?.level ?? mapping?.preservation ?? mapping?.precision ?? "unknown";
  const stableId = context.stableId ??
    sourcePreservation?.semanticSymbolId ??
    sourcePreservation?.semanticNodeId ??
    sourcePreservation?.nativeAstNodeId ??
    sourcePreservation?.semanticOccurrenceId ??
    mapping?.semanticSymbolId ??
    mapping?.semanticNodeId ??
    mapping?.nativeAstNodeId ??
    mapping?.semanticOccurrenceId ??
    "unknown";
  return [
    "source-preservation",
    sourceMapId,
    mappingId,
    level,
    stableId
  ].map(conflictKeyPart).join(":");
}

export function collectSemanticMergeAdmissionConflictKeys(candidate, options = {}) {
  const keys = [
    ...stringList(candidate?.conflictKeys),
    ...stringList(options.extraConflictKeys),
    ...metadataStringList(candidate, "conflictKeys"),
    ...metadataStringList(candidate, "generatedOutputConflictKeys"),
    ...metadataStringList(candidate, "sourceSubtreeConflictKeys"),
    ...stringList(options.sourcePreservationConflictKeys),
    ...metadataStringList(candidate, "sourcePreservationConflictKeys"),
    ...sourcePreservationKeys(options.sourcePreservationKeys),
    ...sourcePreservationKeys(metadataValueList(candidate, "sourcePreservationKeys")),
    ...mergeContractSourcePreservationKeys(options.mergeContracts),
    ...mergeContractSourcePreservationKeys(metadataMergeContracts(candidate))
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
      if (generatedMappingMatchesCandidate(candidate, mapping, options)) {
        keys.push(semanticMergeSourcePreservationConflictKey(mapping, { sourceMap, mapping }));
      }
    }
  }
  for (const generatedSpan of options.generatedSpans ?? []) {
    keys.push(semanticMergeGeneratedOutputConflictKey(generatedSpan));
  }
  for (const sourcePreservation of options.sourcePreservations ?? []) {
    keys.push(semanticMergeSourcePreservationConflictKey(sourcePreservation));
  }
  return unique(keys.filter((key) => typeof key === "string" && key.length > 0)).sort(ordinalCompare);
}

export function semanticMergeConflictKeyKind(conflictKey) {
  if (conflictKey.startsWith("symbol:")) return "symbol";
  if (conflictKey.startsWith("node:")) return "semantic-node";
  if (conflictKey.startsWith("region:")) return "region";
  if (conflictKey.startsWith("native:")) return "native-span";
  if (conflictKey.startsWith("source-preservation:")) return "source-preservation";
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
  const admissionId = admissionOptions.id ?? `merge-admission:${candidate?.id ?? "unknown"}`;
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
  const jsTsContractAdmission = classifyJsTsMergeContracts({
    candidate,
    admissionOptions,
    conflictKeys,
    evidence,
    failedEvidence,
    passedEvidence
  });
  const blockers = [];
  const review = [];
  const notes = [];
  const conflicts = [];

  if (!candidate) {
    const reason = "No merge candidate was supplied.";
    blockers.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.no-candidate",
      severity: "error",
      reason,
      remediationHints: [remediationHint("supply-candidate", "candidate")]
    }));
  }
  if (failedEvidence.length > 0) {
    const failedEvidenceIds = failedEvidence.map((record) => record.id);
    const reason = `Failed evidence prevents admission: ${failedEvidenceIds.join(", ")}`;
    blockers.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.failed-evidence",
      severity: "error",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("rerun-evidence", "evidence", failedEvidenceIds)]
    }));
  }
  if (candidate?.readiness === "blocked") {
    const reason = "Candidate readiness is blocked.";
    blockers.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.readiness-blocked",
      severity: "error",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("repair-candidate", "candidate", [candidate.id])]
    }));
  }
  if (errorLosses.length > 0) {
    const errorLossIds = errorLosses.map((record) => record.id);
    const reason = `Blocking native loss(es) require repair: ${errorLossIds.join(", ")}`;
    blockers.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.blocking-loss",
      severity: "error",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys, losses: errorLosses }),
      sourceSpans: [...collectCandidateSourceSpans(candidate), ...collectLossSourceSpans(errorLosses)],
      reason,
      remediationHints: [remediationHint("repair-loss", "loss", errorLossIds)]
    }));
  }
  if (conflictKeys.length === 0) {
    const reason = "Candidate has no stable semantic merge conflict keys.";
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.missing-conflict-keys",
      severity: "warning",
      candidate,
      affectedContractIds: collectAffectedContractIds({ candidate }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("add-conflict-keys", "candidate", candidate?.id ? [candidate.id] : [])]
    }));
  }
  if (missingKinds.length > 0) {
    const reason = `Candidate is missing required conflict key kind(s): ${missingKinds.join(", ")}`;
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.missing-required-kind",
      severity: "warning",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("add-conflict-key-kind", "conflictKeyKind", missingKinds)]
    }));
  }
  if (admissionOptions.opaque || candidate?.metadata?.opaque === true || candidate?.metadata?.dynamic === true) {
    const reason = "Candidate is marked opaque or dynamic and must not be auto-merged.";
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.opaque-or-dynamic",
      severity: "warning",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("manual-review", "candidate", candidate?.id ? [candidate.id] : [])]
    }));
  }
  if (dynamicEffectKeys.length > 0) {
    const reason = `Dynamic effect conflict key(s) require review: ${dynamicEffectKeys.join(", ")}`;
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.dynamic-effect",
      severity: "warning",
      candidate,
      conflictKeys: dynamicEffectKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys: dynamicEffectKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("review-dynamic-effect", "effect", dynamicEffectKeys.map((key) => key.slice("effect:".length)))]
    }));
  } else if (effectKeys.length > 0) {
    const reason = `Effect conflict key(s) require review: ${effectKeys.join(", ")}`;
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.effect-boundary",
      severity: "warning",
      candidate,
      conflictKeys: effectKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys: effectKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("review-effect-boundary", "effect", effectKeys.map((key) => key.slice("effect:".length)))]
    }));
  }
  if (unknownEvidence.length > 0) {
    const unknownEvidenceIds = unknownEvidence.map((record) => record.id);
    const reason = `Unknown evidence requires review: ${unknownEvidenceIds.join(", ")}`;
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.unknown-evidence",
      severity: "warning",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("resolve-evidence", "evidence", unknownEvidenceIds)]
    }));
  }
  blockers.push(...jsTsContractAdmission.blockers);
  review.push(...jsTsContractAdmission.review);
  notes.push(...jsTsContractAdmission.notes);
  if (candidate?.readiness === "needs-review" || candidate?.readiness === "review-required") {
    const reason = "Candidate readiness requires review.";
    review.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.readiness-review",
      severity: "warning",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys }),
      sourceSpans: collectCandidateSourceSpans(candidate),
      reason,
      remediationHints: [remediationHint("manual-review", "candidate", candidate?.id ? [candidate.id] : [])]
    }));
  }
  if (nonBlockingLosses.length > 0 || candidate?.readiness === "ready-with-losses" || candidate?.readiness === "safe-with-losses") {
    const nonBlockingLossIds = nonBlockingLosses.map((record) => record.id);
    const reason = `Non-blocking loss evidence is present: ${nonBlockingLossIds.join(", ") || "candidate readiness"}`;
    notes.push(reason);
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId,
      code: "semantic-merge.non-blocking-loss",
      severity: "info",
      candidate,
      conflictKeys,
      affectedContractIds: collectAffectedContractIds({ candidate, conflictKeys, losses: nonBlockingLosses }),
      sourceSpans: [...collectCandidateSourceSpans(candidate), ...collectLossSourceSpans(nonBlockingLosses)],
      reason,
      remediationHints: [remediationHint("review-loss", "loss", nonBlockingLossIds)]
    }));
  }
  if (passedEvidence.length > 0) notes.push(`Passed evidence supports admission: ${passedEvidence.map((record) => record.id).join(", ")}`);
  if (conflictKeyKinds.length > 0) notes.push(`Stable conflict keys cover: ${conflictKeyKinds.join(", ")}`);

  const competingConflicts = collectCompetingCandidateConflicts({
    admissionId,
    candidate,
    conflictKeys,
    competingCandidates: admissionOptions.competingCandidates ?? []
  });
  const suppliedConflicts = normalizeSuppliedSemanticMergeConflicts(admissionOptions.conflicts ?? [], {
    admissionId,
    candidate,
    conflictKeys
  });
  for (const conflict of sortSemanticMergeConflictSidecars([...competingConflicts, ...suppliedConflicts])) {
    conflicts.push(conflict);
    if (conflict.severity === "error") blockers.push(conflict.reason);
    else if (conflict.severity === "warning") review.push(conflict.reason);
    else notes.push(conflict.reason);
  }

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
    conflicts: sortSemanticMergeConflictSidecars(conflicts),
    evidence,
    losses,
    metadata: {
      candidateReadiness: candidate?.readiness,
      requiredConflictKeyKinds: requiredKinds,
      missingRequiredConflictKeyKinds: missingKinds,
      ...(jsTsContractAdmission.contracts.length > 0
        ? { jsTsMergeContracts: jsTsContractAdmission.contracts }
        : {}),
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

function classifyJsTsMergeContracts(input) {
  const candidateLanguage = normalizeLanguage(input.candidate?.language);
  const contracts = normalizeMergeContracts([
    ...(input.admissionOptions.mergeContracts ?? []),
    ...metadataMergeContracts(input.candidate)
  ]);
  const blockers = [];
  const review = [];
  const notes = [];
  const classifiedContracts = [];

  for (const [index, contract] of contracts.entries()) {
    const language = normalizeLanguage(contract.language ?? candidateLanguage);
    if (!isJsTsLanguage(language)) {
      continue;
    }

    const contractId = contract.id ?? `js-ts-merge-contract:${index + 1}`;
    const contractKind = normalizeContractKind(contract);
    const status = normalizeContractStatus(contract);
    const contractBlockers = [];
    const contractReview = [];
    const requiredKinds = unique([
      ...JS_TS_SEMANTIC_MERGE_REQUIRED_CONFLICT_KEY_KINDS,
      ...stringList(contract.requiredConflictKeyKinds)
    ]);
    const missingRequiredKinds = requiredKinds.filter((kind) =>
      !input.conflictKeys.some((key) => semanticMergeConflictKeyKind(key) === kind && isStableConflictKeyForKind(kind, key))
    );
    const requiredEvidenceIds = unique([
      ...stringList(contract.requiredEvidenceIds),
      ...stringList(contract.evidenceIds),
      ...(typeof contract.evidenceId === "string" ? [contract.evidenceId] : [])
    ]);
    const evidenceById = new Map(input.evidence.map((record) => [record.id, record]));
    const missingEvidenceIds = requiredEvidenceIds.filter((id) => !evidenceById.has(id));
    const failedEvidenceIds = requiredEvidenceIds
      .map((id) => evidenceById.get(id))
      .filter((record) => record?.status === "failed")
      .map((record) => record.id);
    const unknownEvidenceIds = requiredEvidenceIds
      .map((id) => evidenceById.get(id))
      .filter((record) => record?.status === "unknown")
      .map((record) => record.id);
    const passedEvidenceIds = requiredEvidenceIds.length > 0
      ? requiredEvidenceIds
        .map((id) => evidenceById.get(id))
        .filter((record) => record?.status === "passed")
        .map((record) => record.id)
      : input.passedEvidence.map((record) => record.id);

    if (!JS_TS_SEMANTIC_MERGE_SAFE_CONTRACT_KINDS.includes(contractKind)) {
      contractReview.push(`JS/TS merge contract ${contractId} uses unsupported safe-case kind ${contractKind || "unknown"}.`);
    }
    if (status === "blocked" || status === "failed") {
      contractBlockers.push(`JS/TS merge contract ${contractId} is ${status}.`);
    } else if (status === "unsafe" || status === "review-required" || status === "needs-review" || status === "unknown") {
      contractReview.push(`JS/TS merge contract ${contractId} is ${status}.`);
    }
    if (contract.safe === false || contract.autoMerge === false || contract.autoMergeable === false) {
      contractReview.push(`JS/TS merge contract ${contractId} does not claim safe auto-merge.`);
    }
    if (missingRequiredKinds.length > 0) {
      contractReview.push(`JS/TS merge contract ${contractId} is missing stable required conflict key kind(s): ${missingRequiredKinds.join(", ")}.`);
    }
    if (missingEvidenceIds.length > 0) {
      contractReview.push(`JS/TS merge contract ${contractId} is missing required evidence: ${missingEvidenceIds.join(", ")}.`);
    }
    if (failedEvidenceIds.length > 0) {
      contractBlockers.push(`JS/TS merge contract ${contractId} has failed required evidence: ${failedEvidenceIds.join(", ")}.`);
    }
    if (unknownEvidenceIds.length > 0) {
      contractReview.push(`JS/TS merge contract ${contractId} has unknown required evidence: ${unknownEvidenceIds.join(", ")}.`);
    }
    if (passedEvidenceIds.length === 0) {
      contractReview.push(`JS/TS merge contract ${contractId} has no passed evidence.`);
    }

    blockers.push(...contractBlockers);
    review.push(...contractReview);
    if (contractBlockers.length === 0 && contractReview.length === 0) {
      notes.push(`JS/TS merge contract ${contractId} satisfies safe ${contractKind} admission requirements.`);
    }
    classifiedContracts.push({
      id: contractId,
      kind: contractKind || "unknown",
      language,
      classification: contractBlockers.length > 0 ? "blocked" : contractReview.length > 0 ? "review-required" : "safe",
      requiredConflictKeyKinds: requiredKinds,
      missingRequiredConflictKeyKinds: missingRequiredKinds,
      requiredEvidenceIds,
      missingEvidenceIds,
      unknownEvidenceIds,
      failedEvidenceIds,
      passedEvidenceIds,
      reasons: unique([...contractBlockers, ...contractReview, ...stringList(contract.reasons)])
    });
  }

  return {
    blockers: unique(blockers),
    review: unique(review),
    notes: unique(notes),
    contracts: classifiedContracts
  };
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

function normalizeMergeContracts(values) {
  return values.filter((value) => value && typeof value === "object");
}

function metadataMergeContracts(candidate) {
  const metadata = candidate?.metadata;
  const values = [];
  for (const key of ["semanticMergeContracts", "mergeContracts"]) {
    if (Array.isArray(metadata?.[key])) {
      values.push(...metadata[key]);
    }
  }
  for (const key of ["semanticMergeContract", "mergeContract"]) {
    if (metadata?.[key] && typeof metadata[key] === "object") {
      values.push(metadata[key]);
    }
  }
  return values;
}

function normalizeContractKind(contract) {
  return String(contract.case ?? contract.contractKind ?? contract.operationKind ?? contract.kind ?? "").trim();
}

function normalizeContractStatus(contract) {
  const status = contract.status ?? contract.classification ?? contract.readiness;
  return typeof status === "string" ? status.trim() : "";
}

function normalizeLanguage(language) {
  if (typeof language !== "string") return "";
  if (language === "ts") return "typescript";
  if (language === "js") return "javascript";
  return language;
}

function isJsTsLanguage(language) {
  return language === "typescript" || language === "javascript";
}

function isStableConflictKeyForKind(kind, key) {
  const parts = key.split(":").map((part) => part.trim());
  if (parts.some((part) => part.length === 0 || part === "unknown")) {
    return false;
  }
  if (kind === "native-span") {
    return parts.length >= 7 && parts.slice(1).every((part) => part.length > 0 && part !== "unknown");
  }
  if (kind === "source-preservation") {
    return parts.length >= 5 && parts[3] !== "blocked" && parts[3] !== "estimated";
  }
  return key.length > 0;
}

function mergeContractSourcePreservationKeys(contracts) {
  return normalizeMergeContracts(contracts ?? []).flatMap((contract) => [
    ...sourcePreservationKeys(contract.sourcePreservationKeys),
    ...sourcePreservationKeys(typeof contract.sourcePreservationKey === "string" ? [contract.sourcePreservationKey] : []),
    ...stringList(contract.sourcePreservationConflictKeys)
  ]);
}

function sourcePreservationKeys(values) {
  return stringIdList(values).map((value) =>
    value.startsWith("source-preservation:") ? value : `source-preservation:${conflictKeyPart(value)}`
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

function createSemanticMergeConflictSidecar(input) {
  const conflictKeys = uniqueSortedStrings(input.conflictKeys ?? []);
  const affectedContractIds = uniqueSortedStrings(input.affectedContractIds ?? []);
  const sourceSpans = uniqueSourceSpans(input.sourceSpans ?? []);
  const competingCandidates = uniqueCompetingCandidates(input.competingCandidates ?? (input.candidate
    ? [semanticMergeConflictCandidateRef(input.candidate, input.candidateConflictKeys ?? conflictKeys)]
    : []));
  const remediationHints = normalizeRemediationHints(input.remediationHints ?? []);
  const code = normalizeReasonCode(input.code);
  const severity = normalizeConflictSeverity(input.severity);
  return {
    kind: "frontier.lang.semanticMergeConflict",
    version: 1,
    id: input.id ?? stableConflictSidecarId({
      admissionId: input.admissionId,
      code,
      severity,
      conflictKeys,
      affectedContractIds,
      competingCandidateIds: competingCandidates.map((candidate) => candidate.id),
      reason: input.reason
    }),
    code,
    severity,
    affectedContractIds,
    conflictKeys,
    sourceSpans,
    competingCandidates,
    reason: input.reason,
    remediationHints,
    ...(input.metadata && typeof input.metadata === "object" ? { metadata: input.metadata } : {})
  };
}

function collectCompetingCandidateConflicts(input) {
  if (!input.candidate) return [];
  const currentKeys = uniqueSortedStrings(input.conflictKeys);
  if (currentKeys.length === 0) return [];
  const conflicts = [];
  for (const competitor of input.competingCandidates) {
    if (!competitor || competitor.id === input.candidate.id) continue;
    const competitorKeys = collectSemanticMergeAdmissionConflictKeys(competitor);
    const sharedKeys = intersection(currentKeys, competitorKeys).sort(ordinalCompare);
    if (sharedKeys.length === 0) continue;
    const competingCandidates = [
      semanticMergeConflictCandidateRef(input.candidate, currentKeys),
      semanticMergeConflictCandidateRef(competitor, competitorKeys)
    ];
    conflicts.push(createSemanticMergeConflictSidecar({
      admissionId: input.admissionId,
      code: "semantic-merge.competing-candidate",
      severity: "warning",
      conflictKeys: sharedKeys,
      affectedContractIds: collectAffectedContractIds({
        candidate: input.candidate,
        conflictKeys: sharedKeys,
        extraIds: collectAffectedContractIds({ candidate: competitor, conflictKeys: sharedKeys })
      }),
      sourceSpans: [
        ...collectCandidateSourceSpans(input.candidate),
        ...collectCandidateSourceSpans(competitor)
      ],
      competingCandidates,
      reason: `Competing merge candidate ${competitor.id} touches the same stable conflict key(s): ${sharedKeys.join(", ")}`,
      remediationHints: [
        remediationHint("choose-candidate", "candidate", competingCandidates.map((candidate) => candidate.id)),
        remediationHint("split-conflict-surface", "conflictKey", sharedKeys)
      ]
    }));
  }
  return conflicts;
}

function normalizeSuppliedSemanticMergeConflicts(conflicts, context) {
  return conflicts.map((conflict) => createSemanticMergeConflictSidecar({
    admissionId: context.admissionId,
    id: conflict.id,
    code: conflict.code ?? "semantic-merge.external-conflict",
    severity: conflict.severity ?? "warning",
    candidate: context.candidate,
    candidateConflictKeys: context.conflictKeys,
    conflictKeys: conflict.conflictKeys ?? context.conflictKeys,
    affectedContractIds: conflict.affectedContractIds ?? collectAffectedContractIds({
      candidate: context.candidate,
      conflictKeys: conflict.conflictKeys ?? context.conflictKeys
    }),
    sourceSpans: conflict.sourceSpans ?? collectCandidateSourceSpans(context.candidate),
    competingCandidates: conflict.competingCandidates,
    reason: conflict.reason ?? "External semantic merge conflict requires review.",
    remediationHints: conflict.remediationHints ?? [remediationHint("manual-review", "candidate", context.candidate?.id ? [context.candidate.id] : [])],
    metadata: conflict.metadata
  }));
}

function sortSemanticMergeConflictSidecars(conflicts) {
  return uniqueById(conflicts).sort((left, right) => {
    const severity = severityRank(left.severity) - severityRank(right.severity);
    if (severity !== 0) return severity;
    return ordinalCompare(sidecarSortKey(left), sidecarSortKey(right));
  });
}

function sidecarSortKey(conflict) {
  return [
    conflict.code,
    conflict.affectedContractIds.join("\u0000"),
    conflict.conflictKeys.join("\u0000"),
    conflict.competingCandidates.map((candidate) => candidate.id).join("\u0000"),
    conflict.reason,
    conflict.id
  ].join("\u0001");
}

function stableConflictSidecarId(input) {
  const scope = [
    input.admissionId,
    input.severity,
    input.code,
    ...(input.affectedContractIds.length > 0 ? input.affectedContractIds : []),
    ...(input.conflictKeys.length > 0 ? input.conflictKeys : []),
    ...(input.competingCandidateIds.length > 0 ? input.competingCandidateIds : []),
    input.reason
  ].filter(Boolean).map(stableIdPart).join(":");
  return `semantic-merge-conflict:${scope}`;
}

function semanticMergeConflictCandidateRef(candidate, conflictKeys) {
  return {
    id: candidate.id,
    ...(candidate.readiness ? { readiness: candidate.readiness } : {}),
    ...(candidate.sourcePath ? { sourcePath: candidate.sourcePath } : {}),
    conflictKeys: uniqueSortedStrings(conflictKeys)
  };
}

function uniqueCompetingCandidates(candidates) {
  const normalized = [];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      normalized.push({ id: candidate, conflictKeys: [] });
    } else if (candidate?.id) {
      normalized.push({
        id: candidate.id,
        ...(candidate.readiness ? { readiness: candidate.readiness } : {}),
        ...(candidate.sourcePath ? { sourcePath: candidate.sourcePath } : {}),
        conflictKeys: uniqueSortedStrings(candidate.conflictKeys ?? [])
      });
    }
  }
  return uniqueById(normalized).sort((left, right) => ordinalCompare(left.id, right.id));
}

function collectAffectedContractIds(input) {
  const ids = [];
  ids.push(...stringIdList(input.extraIds));
  for (const symbol of input.candidate?.touchedSymbols ?? []) {
    ids.push(symbol.id, symbol.semanticNodeId);
  }
  for (const node of input.candidate?.touchedSemanticNodes ?? []) {
    ids.push(node.id);
  }
  for (const span of input.candidate?.nativeSpans ?? []) {
    ids.push(span.semanticNodeId, span.symbolId);
  }
  for (const loss of input.losses ?? []) {
    ids.push(loss.semanticIndexId, loss.semanticSymbolId, loss.semanticOccurrenceId, loss.nodeId);
  }
  for (const conflictKey of input.conflictKeys ?? []) {
    ids.push(affectedContractIdFromConflictKey(conflictKey));
  }
  return uniqueSortedStrings(ids);
}

function affectedContractIdFromConflictKey(conflictKey) {
  if (conflictKey.startsWith("symbol:")) return conflictKey.slice("symbol:".length);
  if (conflictKey.startsWith("node:")) return conflictKey.slice("node:".length);
  if (conflictKey.startsWith("region:")) return conflictKey.slice("region:".length);
  if (conflictKey.startsWith("effect:")) return conflictKey.slice("effect:".length);
  if (conflictKey.startsWith("sig:")) {
    const parts = conflictKey.split(":");
    if (parts.length >= 4) return `${parts[2]}:${parts[3]}`;
  }
  return undefined;
}

function collectCandidateSourceSpans(candidate) {
  return uniqueSourceSpans([
    ...(candidate?.touchedSymbols ?? []).map((symbol) => symbol.span),
    ...(candidate?.nativeSpans ?? []).map((span) => span.span)
  ]);
}

function collectLossSourceSpans(losses) {
  return uniqueSourceSpans(losses.map((loss) => loss.span));
}

function uniqueSourceSpans(spans) {
  const byKey = new Map();
  for (const span of spans) {
    const normalized = normalizeSourceSpan(span);
    if (!normalized) continue;
    byKey.set(sourceSpanKey(normalized), normalized);
  }
  return [...byKey.entries()]
    .sort(([left], [right]) => ordinalCompare(left, right))
    .map(([, span]) => span);
}

function normalizeSourceSpan(span) {
  if (!span || typeof span !== "object") return undefined;
  const normalized = {};
  for (const key of ["sourceId", "path", "start", "end", "startLine", "startColumn", "endLine", "endColumn"]) {
    if (span[key] !== undefined) {
      normalized[key] = span[key];
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function sourceSpanKey(span) {
  return [
    span.path ?? "",
    span.sourceId ?? "",
    span.startLine ?? "",
    span.startColumn ?? "",
    span.endLine ?? "",
    span.endColumn ?? "",
    span.start ?? "",
    span.end ?? ""
  ].map((value) => String(value)).join(":");
}

function remediationHint(action, target, targetIds = []) {
  return {
    action,
    target,
    targetIds: uniqueSortedStrings(targetIds)
  };
}

function normalizeRemediationHints(hints) {
  return hints.map((hint) => {
    if (typeof hint === "string") {
      return { action: hint, targetIds: [] };
    }
    const action = typeof hint?.action === "string" && hint.action.length > 0 ? hint.action : "manual-review";
    return {
      action,
      ...(typeof hint?.target === "string" ? { target: hint.target } : {}),
      targetIds: uniqueSortedStrings(hint?.targetIds ?? []),
      ...(typeof hint?.detail === "string" ? { detail: hint.detail } : {}),
      ...(hint?.metadata && typeof hint.metadata === "object" ? { metadata: hint.metadata } : {})
    };
  }).sort((left, right) => ordinalCompare(remediationHintSortKey(left), remediationHintSortKey(right)));
}

function remediationHintSortKey(hint) {
  return [
    hint.action,
    hint.target ?? "",
    hint.targetIds.join("\u0000"),
    hint.detail ?? ""
  ].join("\u0001");
}

function metadataStringList(candidate, key) {
  return stringIdList(candidate?.metadata?.[key]);
}

function metadataValueList(candidate, key) {
  const value = candidate?.metadata?.[key];
  return Array.isArray(value) ? value : [];
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

function uniqueSortedStrings(values) {
  return unique(values.filter((value) => typeof value === "string" && value.length > 0)).sort(ordinalCompare);
}

function normalizeConflictSeverity(severity) {
  return severity === "error" || severity === "warning" || severity === "info" ? severity : "warning";
}

function severityRank(severity) {
  return SEMANTIC_MERGE_CONFLICT_SEVERITY_ORDER[normalizeConflictSeverity(severity)];
}

function normalizeReasonCode(code) {
  return typeof code === "string" && code.length > 0 ? code : "semantic-merge.external-conflict";
}

function stableIdPart(value) {
  return conflictKeyPart(value).replace(/[^A-Za-z0-9._:%-]+/g, "-").slice(0, 120);
}

function conflictKeyPart(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ");
}
