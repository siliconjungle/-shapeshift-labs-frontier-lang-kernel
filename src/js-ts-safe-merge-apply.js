import { ordinalCompare, unique, uniqueById } from "./shared.js";

export const JS_TS_SAFE_MERGE_APPLY_CLASSIFICATIONS = Object.freeze([
  "safe-apply",
  "no-op",
  "stale",
  "review-required",
  "blocked-evidence"
]);

export const JS_TS_SAFE_MERGE_APPLY_DECISIONS = Object.freeze([
  "accept",
  "reject",
  "review",
  "block"
]);

export const JS_TS_SAFE_MERGE_APPLY_SAFE_CASE_KINDS = Object.freeze([
  "import",
  "declaration",
  "member"
]);

export function createJsTsSafeMergeApplyRecord(input = {}) {
  return classifyJsTsSafeMergeApplyRecord(input);
}

export function classifyJsTsSafeMergeApplyRecord(input = {}) {
  const evidence = normalizeEvidence(input.evidence ?? []);
  const conflictKeys = uniqueStrings(input.conflictKeys, input.conflictKey);
  const conflicts = normalizeApplyConflicts(input.conflicts ?? input.conflictSidecars ?? []);
  const conflictKeyKinds = uniqueStrings(
    input.conflictKeyKinds,
    conflictKeys.map((key) => jsTsSafeMergeConflictKeyKind(key)),
    conflicts.flatMap((conflict) => (conflict.conflictKeys ?? []).map((key) => jsTsSafeMergeConflictKeyKind(key)))
  ).sort(ordinalCompare);
  const contractIds = uniqueStrings(
    input.contractIds,
    input.contractId,
    input.mergeContractIds,
    input.mergeContractId
  );
  const patchIds = uniqueStrings(input.patchIds, input.patchId, input.patch?.id);
  const operationCount = numericValue(input.operationCount) ??
    numericValue(input.semanticChangeCount) ??
    operationCountFromPatch(input.patch) ??
    operationCountFromOperations(input.operations);
  const changed = changedValue(input, operationCount);
  const noOp = Boolean(input.noOp ?? input.noop) ||
    changed === false ||
    operationCount === 0 ||
    alreadyAtTarget(input);
  const stale = Boolean(input.stale) || staleAgainstCurrentBase(input);
  const language = normalizeLanguage(input.language);
  const safeCaseKind = normalizeSafeCaseKind(input);
  const status = normalizeStatus(input.status ?? input.readiness);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId, evidence.map((record) => record.id));
  const requiredEvidenceIds = uniqueStrings(input.requiredEvidenceIds, input.requiredEvidenceId, input.evidenceIds, input.evidenceId);
  const passedEvidenceIds = uniqueStrings(
    input.passedEvidenceIds,
    evidence.filter((record) => record.status === "passed").map((record) => record.id)
  );
  const failedEvidenceIds = uniqueStrings(
    input.failedEvidenceIds,
    evidence.filter((record) => record.status === "failed").map((record) => record.id)
  );
  const unknownEvidenceIds = uniqueStrings(
    input.unknownEvidenceIds,
    evidence.filter((record) => record.status === "unknown").map((record) => record.id)
  );
  const observedEvidenceIds = new Set([
    ...passedEvidenceIds,
    ...failedEvidenceIds,
    ...unknownEvidenceIds
  ]);
  const missingEvidenceIds = uniqueStrings(
    input.missingEvidenceIds,
    requiredEvidenceIds.filter((id) => !observedEvidenceIds.has(id))
  );
  const blockers = [];
  const rejections = [];
  const review = [];
  const notes = [];

  if (status === "blocked" || status === "failed" || failedEvidenceIds.length > 0) {
    const reason = failedEvidenceIds.length > 0
      ? `Failed JS/TS safe-merge evidence prevents apply: ${failedEvidenceIds.join(", ")}`
      : "JS/TS safe-merge apply gate is blocked.";
    blockers.push(reason);
  }
  if (stale) {
    const expectedBaseHash = input.expectedBaseHash ?? input.baseHash;
    const currentBaseHash = input.currentBaseHash;
    rejections.push(expectedBaseHash && currentBaseHash
      ? `JS/TS safe-merge apply gate is stale: expected base ${expectedBaseHash}, current base ${currentBaseHash}.`
      : "JS/TS safe-merge apply gate is stale.");
  }
  if (noOp) {
    rejections.push("JS/TS safe-merge apply gate has no source or semantic change to apply.");
  }
  if (changed === undefined && !noOp) {
    review.push("JS/TS safe-merge apply gate does not declare whether source or semantic content changed.");
  }
  if (!isJsTsLanguage(language)) {
    review.push(`JS/TS safe-merge apply gate has unsupported language ${language || "unknown"}.`);
  }
  if (!JS_TS_SAFE_MERGE_APPLY_SAFE_CASE_KINDS.includes(safeCaseKind)) {
    review.push(`JS/TS safe-merge apply gate uses unsupported safe-case kind ${safeCaseKind || "unknown"}.`);
  }
  if (status === "unsafe" || status === "review-required" || status === "needs-review" || status === "unknown") {
    review.push(`JS/TS safe-merge apply gate is ${status}.`);
  }
  if (input.safe === false || input.autoApply === false || input.autoApplyable === false || input.autoMergeable === false) {
    review.push("JS/TS safe-merge apply gate does not claim safe auto-apply.");
  }
  if (conflicts.length > 0 || input.hasConflicts === true) {
    review.push(`JS/TS safe-merge apply gate has unresolved conflict metadata: ${conflicts.map((conflict) => conflict.id).join(", ") || "conflict"}.`);
  }
  if (missingEvidenceIds.length > 0) {
    review.push(`JS/TS safe-merge apply gate is missing required evidence: ${missingEvidenceIds.join(", ")}.`);
  }
  if (unknownEvidenceIds.length > 0) {
    review.push(`JS/TS safe-merge apply gate has unknown evidence: ${unknownEvidenceIds.join(", ")}.`);
  }
  if (passedEvidenceIds.length === 0) {
    review.push("JS/TS safe-merge apply gate has no passed evidence.");
  } else {
    notes.push(`Passed JS/TS safe-merge evidence supports apply: ${passedEvidenceIds.join(", ")}`);
  }
  if (changed === true) {
    notes.push("JS/TS safe-merge apply gate carries an explicit source or semantic change.");
  }

  const classification = blockers.length > 0
    ? "blocked-evidence"
    : stale
      ? "stale"
      : noOp
        ? "no-op"
        : review.length > 0
          ? "review-required"
          : "safe-apply";
  const decision = applyDecisionForClassification(classification);
  const id = input.id ?? jsTsSafeMergeApplyId({
    candidateId: input.candidateId,
    sourcePath: input.sourcePath,
    safeCaseKind,
    patchIds,
    contractIds
  });

  return {
    kind: "frontier.lang.jsTsSafeMergeApply",
    version: 1,
    id,
    ...(input.candidateId ? { candidateId: input.candidateId } : {}),
    ...(language ? { language } : {}),
    ...(input.sourcePath ? { sourcePath: input.sourcePath } : {}),
    safeCaseKind: safeCaseKind || "unknown",
    classification,
    decision,
    autoApplyable: decision === "accept",
    changed: changed === undefined ? false : changed,
    noOp,
    stale,
    ...(operationCount !== undefined ? { operationCount } : {}),
    ...(input.sourceHash ? { sourceHash: input.sourceHash } : {}),
    ...(input.currentSourceHash ? { currentSourceHash: input.currentSourceHash } : {}),
    ...(input.baseHash ? { baseHash: input.baseHash } : {}),
    ...(input.expectedBaseHash ? { expectedBaseHash: input.expectedBaseHash } : {}),
    ...(input.currentBaseHash ? { currentBaseHash: input.currentBaseHash } : {}),
    ...(input.targetHash ? { targetHash: input.targetHash } : {}),
    ...(input.currentTargetHash ? { currentTargetHash: input.currentTargetHash } : {}),
    patchIds,
    contractIds,
    conflictKeys,
    conflictKeyKinds,
    conflicts,
    evidence,
    evidenceIds,
    requiredEvidenceIds,
    passedEvidenceIds,
    failedEvidenceIds,
    unknownEvidenceIds,
    missingEvidenceIds,
    reasons: unique([...blockers, ...rejections, ...review, ...notes, ...stringList(input.reasons)]),
    metadata: input.metadata ?? {}
  };
}

export function classifyJsTsSafeMergeApplyRecords(records = []) {
  return normalizeApplyRecords(records).map((record) => classifyJsTsSafeMergeApplyRecord(record));
}

function applyDecisionForClassification(classification) {
  if (classification === "safe-apply") return "accept";
  if (classification === "review-required") return "review";
  if (classification === "blocked-evidence") return "block";
  return "reject";
}

function normalizeApplyRecords(records) {
  return (Array.isArray(records) ? records : []).filter((record) => record && typeof record === "object");
}

function normalizeApplyConflicts(conflicts) {
  const normalized = [];
  for (const conflict of Array.isArray(conflicts) ? conflicts : []) {
    if (typeof conflict === "string") {
      normalized.push({
        id: `js-ts-safe-merge-conflict:${stableIdPart(conflict)}`,
        reason: conflict,
        severity: "warning",
        conflictKeys: []
      });
      continue;
    }
    if (!conflict || typeof conflict !== "object") continue;
    const conflictKeys = uniqueStrings(conflict.conflictKeys, conflict.conflictKey);
    normalized.push({
      id: conflict.id ?? jsTsApplyConflictId(conflict, conflictKeys),
      reason: conflict.reason ?? conflict.summary ?? "JS/TS safe-merge conflict requires review.",
      severity: normalizeSeverity(conflict.severity),
      conflictKeys,
      ...(conflict.metadata && typeof conflict.metadata === "object" ? { metadata: conflict.metadata } : {})
    });
  }
  return uniqueById(normalized).sort((left, right) => ordinalCompare(left.id, right.id));
}

function normalizeEvidence(records) {
  return uniqueById((Array.isArray(records) ? records : []).filter((record) =>
    record && typeof record === "object" && typeof record.id === "string"
  ));
}

function jsTsSafeMergeConflictKeyKind(conflictKey) {
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

function normalizeLanguage(language) {
  if (typeof language !== "string") return "";
  if (language === "ts") return "typescript";
  if (language === "js") return "javascript";
  return language;
}

function isJsTsLanguage(language) {
  return language === "typescript" || language === "javascript";
}

function normalizeSafeCaseKind(input) {
  const value = input.safeCaseKind ??
    input.applyKind ??
    input.case ??
    input.contractKind ??
    input.operationKind ??
    (typeof input.kind === "string" && !input.kind.startsWith("frontier.lang.") ? input.kind : "");
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  if (normalized === "topLevelDeclaration" || normalized === "top-level-declaration" || normalized === "declarations") {
    return "declaration";
  }
  return normalized;
}

function normalizeStatus(status) {
  return typeof status === "string" ? status.trim() : "";
}

function normalizeSeverity(severity) {
  return severity === "error" || severity === "warning" || severity === "info" ? severity : "warning";
}

function numericValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function operationCountFromPatch(patch) {
  return Array.isArray(patch?.operations) ? patch.operations.length : undefined;
}

function operationCountFromOperations(operations) {
  return Array.isArray(operations) ? operations.length : undefined;
}

function changedValue(input, operationCount) {
  if (typeof input.changed === "boolean") return input.changed;
  if (operationCount !== undefined) return operationCount > 0;
  if (typeof input.sourceHash === "string" && typeof input.targetHash === "string") {
    return input.sourceHash !== input.targetHash;
  }
  if (typeof input.baseHash === "string" && typeof input.targetHash === "string") {
    return input.baseHash !== input.targetHash;
  }
  return undefined;
}

function staleAgainstCurrentBase(input) {
  const expectedBaseHash = input.expectedBaseHash ?? input.baseHash;
  return typeof expectedBaseHash === "string" &&
    typeof input.currentBaseHash === "string" &&
    expectedBaseHash !== input.currentBaseHash;
}

function alreadyAtTarget(input) {
  return typeof input.targetHash === "string" &&
    typeof input.currentTargetHash === "string" &&
    input.targetHash === input.currentTargetHash;
}

function jsTsSafeMergeApplyId(input) {
  return [
    "js-ts-safe-merge-apply",
    input.candidateId ?? input.sourcePath ?? "candidate",
    input.safeCaseKind ?? "unknown",
    input.patchIds?.join(",") || input.contractIds?.join(",") || "apply"
  ].map(stableIdPart).join(":");
}

function jsTsApplyConflictId(conflict, conflictKeys) {
  return [
    "js-ts-safe-merge-conflict",
    conflict.severity ?? "warning",
    conflict.reason ?? conflict.summary ?? "conflict",
    conflictKeys.join(",")
  ].map(stableIdPart).join(":");
}

function stringList(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === "string" && value.length > 0) : [];
}

function uniqueStrings(...values) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value === "string" && value.length > 0) {
      result.push(value);
    }
  };
  for (const value of values) visit(value);
  return unique(result).sort(ordinalCompare);
}

function stableIdPart(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ").replace(/[^A-Za-z0-9._:%,-]+/g, "-").slice(0, 120);
}
