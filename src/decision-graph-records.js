import { hashSemanticValue } from "./hashing.js";
import { ordinalCompare, unique } from "./shared.js";

export const DECISION_GRAPH_RECORD_KINDS = Object.freeze([
  "frontier.lang.decisionGraph.gate",
  "frontier.lang.decisionGraph.evidence",
  "frontier.lang.decisionGraph.semanticChange",
  "frontier.lang.decisionGraph.candidateDecision",
  "frontier.lang.decisionGraph.mergeDecision",
  "frontier.lang.decisionGraph.replay",
  "frontier.lang.decisionGraph.tournamentCandidate",
  "frontier.lang.decisionGraph.panelProjection",
  "frontier.lang.decisionGraph.improvementFeedback"
]);

export function stableDecisionGraphRecordId(prefix, identity = {}) {
  const label = String(prefix || "decision-record").trim() || "decision-record";
  const hash = hashSemanticValue(compactRecord(identity)).slice("fnv1a32:".length);
  return `${label}:${hash}`;
}

export function createDecisionGraphGateRecord(input = {}) {
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const gateKind = input.gateKind ?? input.gate ?? "custom";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.gate",
    recordKind: "frontier.lang.decisionGraph.gate",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("decision-gate", {
      gateKind,
      name: input.name,
      command: input.command,
      subjectIds: sortedStrings(subjectIds),
      candidateIds: sortedStrings(candidateIds),
      semanticChangeIds: sortedStrings(semanticChangeIds)
    }),
    gateKind,
    name: input.name,
    status: input.status ?? "unknown",
    required: Boolean(input.required),
    command: input.command,
    subjectIds,
    candidateIds,
    semanticChangeIds,
    decisionIds,
    replayRecordIds,
    evidenceIds,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphEvidenceRecord(input = {}) {
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const evidenceKind = input.evidenceKind ?? input.kind ?? "note";
  return compactRecord({
    recordKind: "frontier.lang.decisionGraph.evidence",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("decision-evidence", {
      kind: evidenceKind,
      path: input.path,
      summary: input.summary,
      subjectIds: sortedStrings(subjectIds),
      gateIds: sortedStrings(gateIds),
      semanticChangeIds: sortedStrings(semanticChangeIds)
    }),
    kind: evidenceKind,
    status: input.status ?? "unknown",
    path: input.path,
    summary: input.summary,
    subjectIds,
    gateIds,
    semanticChangeIds,
    candidateIds,
    decisionIds,
    replayRecordIds,
    metadata: input.metadata
  });
}

export function createDecisionGraphSemanticChangeRecord(input = {}) {
  const patchIds = uniqueStrings(input.patchIds, input.patchId);
  const operationIds = uniqueStrings(input.operationIds, input.operationId);
  const semanticNodeIds = uniqueStrings(input.semanticNodeIds, input.semanticNodeId, input.nodeIds, input.nodeId);
  const semanticSymbolIds = uniqueStrings(input.semanticSymbolIds, input.semanticSymbolId);
  const effectIds = uniqueStrings(input.effectIds, input.effectId);
  const regions = uniqueStrings(input.regions, input.region);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const changeKind = input.changeKind ?? "semantic";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.semanticChange",
    recordKind: "frontier.lang.decisionGraph.semanticChange",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("semantic-change", {
      changeKind,
      sourcePath: input.sourcePath,
      baseHash: input.baseHash,
      targetHash: input.targetHash,
      patchIds: sortedStrings(patchIds),
      operationIds: sortedStrings(operationIds),
      semanticNodeIds: sortedStrings(semanticNodeIds),
      semanticSymbolIds: sortedStrings(semanticSymbolIds),
      effectIds: sortedStrings(effectIds),
      regions: sortedStrings(regions)
    }),
    changeKind,
    language: input.language,
    sourcePath: input.sourcePath,
    baseHash: input.baseHash,
    targetHash: input.targetHash,
    patchIds,
    operationIds,
    semanticNodeIds,
    semanticSymbolIds,
    effectIds,
    regions,
    risk: input.risk,
    evidenceIds,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphCandidateDecisionRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const reviewerIds = uniqueStrings(input.reviewerIds, input.reviewerId);
  const reasons = uniqueStrings(input.reasons, input.reason);
  const decision = input.decision ?? "needs-review";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.candidateDecision",
    recordKind: "frontier.lang.decisionGraph.candidateDecision",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("candidate-decision", {
      candidateIds: sortedStrings(candidateIds),
      semanticChangeIds: sortedStrings(semanticChangeIds),
      decision
    }),
    candidateId: input.candidateId,
    candidateIds,
    semanticChangeIds,
    decision,
    status: decisionStatus(input.status, decision),
    score: input.score,
    rank: input.rank,
    gateIds,
    evidenceIds,
    reviewerIds,
    reasons,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphMergeDecisionRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const candidateDecisionIds = uniqueStrings(input.candidateDecisionIds, input.candidateDecisionId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const conflictKeys = uniqueStrings(input.conflictKeys, input.conflictKey);
  const reasons = uniqueStrings(input.reasons, input.reason);
  const decision = input.decision ?? "needs-review";
  const autoMergeable = Boolean(input.autoMergeable ?? decision === "merge");
  return compactRecord({
    kind: "frontier.lang.decisionGraph.mergeDecision",
    recordKind: "frontier.lang.decisionGraph.mergeDecision",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("merge-decision", {
      candidateIds: sortedStrings(candidateIds),
      candidateDecisionIds: sortedStrings(candidateDecisionIds),
      semanticChangeIds: sortedStrings(semanticChangeIds),
      decision
    }),
    decision,
    status: decisionStatus(input.status, decision),
    autoMergeable,
    candidateIds,
    candidateDecisionIds,
    semanticChangeIds,
    baseHash: input.baseHash,
    targetHash: input.targetHash,
    conflictKeys,
    gateIds,
    evidenceIds,
    replayRecordIds,
    reasons,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphReplayRecord(input = {}) {
  const eventIds = uniqueStrings(input.eventIds, input.eventId);
  const patchIds = uniqueStrings(input.patchIds, input.patchId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const issues = uniqueStrings(input.issues, input.issue);
  const status = input.status ?? "unknown";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.replay",
    recordKind: "frontier.lang.decisionGraph.replay",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("replay-record", {
      baseHash: input.baseHash,
      finalHash: input.finalHash,
      eventIds: sortedStrings(eventIds),
      patchIds: sortedStrings(patchIds)
    }),
    status,
    replayComplete: Boolean(input.replayComplete ?? status === "passed"),
    deterministic: Boolean(input.deterministic ?? status === "passed"),
    baseHash: input.baseHash,
    finalHash: input.finalHash,
    eventIds,
    patchIds,
    gateIds,
    evidenceIds,
    decisionIds,
    issues,
    steps: input.steps ?? [],
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphTournamentCandidateRecord(input = {}) {
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  return compactRecord({
    kind: "frontier.lang.decisionGraph.tournamentCandidate",
    recordKind: "frontier.lang.decisionGraph.tournamentCandidate",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("tournament-candidate", {
      tournamentId: input.tournamentId,
      candidateId: input.candidateId,
      lane: input.lane,
      taskId: input.taskId,
      agentId: input.agentId
    }),
    tournamentId: input.tournamentId,
    candidateId: input.candidateId,
    lane: input.lane,
    taskId: input.taskId,
    agentId: input.agentId,
    rank: input.rank,
    score: input.score,
    metrics: input.metrics,
    semanticChangeIds,
    gateIds,
    evidenceIds,
    decisionIds,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphPanelProjectionRecord(input = {}) {
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const mergeDecisionIds = uniqueStrings(input.mergeDecisionIds, input.mergeDecisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const fields = uniqueStrings(input.fields, input.field);
  const projectionKind = input.projectionKind ?? "panel";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.panelProjection",
    recordKind: "frontier.lang.decisionGraph.panelProjection",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("panel-projection", {
      panelId: input.panelId,
      projectionKind,
      subjectIds: sortedStrings(subjectIds),
      candidateIds: sortedStrings(candidateIds),
      mergeDecisionIds: sortedStrings(mergeDecisionIds)
    }),
    panelId: input.panelId,
    projectionKind,
    status: input.status ?? "unknown",
    subjectIds,
    candidateIds,
    mergeDecisionIds,
    gateIds,
    evidenceIds,
    fields,
    projection: input.projection,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphImprovementFeedbackRecord(input = {}) {
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const loopKind = input.loopKind ?? "improvement";
  const feedbackKind = input.feedbackKind ?? "note";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.improvementFeedback",
    recordKind: "frontier.lang.decisionGraph.improvementFeedback",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("improvement-feedback", {
      loopId: input.loopId,
      loopKind,
      feedbackKind,
      subjectId: input.subjectId,
      action: input.action
    }),
    loopId: input.loopId,
    loopKind,
    feedbackKind,
    subjectId: input.subjectId,
    severity: input.severity ?? "info",
    status: input.status ?? "open",
    action: input.action,
    semanticChangeIds,
    decisionIds,
    gateIds,
    evidenceIds,
    feedback: input.feedback,
    summary: input.summary,
    metadata: input.metadata
  });
}

function decisionStatus(status, decision) {
  if (status) return status;
  if (decision === "accepted" || decision === "merge") return "passed";
  if (decision === "rejected" || decision === "do-not-merge" || decision === "blocked") return "failed";
  return "unknown";
}

function uniqueStrings(...values) {
  return unique(values.flat().filter((value) => typeof value === "string" && value.length > 0));
}

function sortedStrings(values) {
  return [...values].sort(ordinalCompare);
}

function compactRecord(record) {
  const result = {};
  for (const [key, value] of Object.entries(record)) {
    const compacted = compactValue(value);
    if (compacted !== undefined) {
      result[key] = compacted;
    }
  }
  return result;
}

function compactValue(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(compactValue).filter((item) => item !== undefined);
  if (isPlainObject(value)) return compactRecord(value);
  return value;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
