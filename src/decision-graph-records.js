import { hashSemanticValue } from "./hashing.js";
import { ordinalCompare, unique } from "./shared.js";

export const DECISION_GRAPH_RECORD_KINDS = Object.freeze([
  "frontier.lang.decisionGraph.graph",
  "frontier.lang.decisionGraph.chunk",
  "frontier.lang.decisionGraph.gate",
  "frontier.lang.decisionGraph.evidence",
  "frontier.lang.decisionGraph.semanticChange",
  "frontier.lang.decisionGraph.patchEvent",
  "frontier.lang.decisionGraph.admissionDecision",
  "frontier.lang.decisionGraph.candidateDecision",
  "frontier.lang.decisionGraph.mergeDecision",
  "frontier.lang.decisionGraph.replay",
  "frontier.lang.decisionGraph.tournament",
  "frontier.lang.decisionGraph.tournamentCandidate",
  "frontier.lang.decisionGraph.rsiLoop",
  "frontier.lang.decisionGraph.panelProjection",
  "frontier.lang.decisionGraph.improvementFeedback"
]);

export function stableDecisionGraphRecordId(prefix, identity = {}) {
  const label = String(prefix || "decision-record").trim() || "decision-record";
  const hash = hashSemanticValue(compactRecord(identity)).slice("fnv1a32:".length);
  return `${label}:${hash}`;
}

export function createDecisionGraphGraphRecord(input = {}) {
  const graphIds = uniqueStrings(input.graphIds, input.graphId);
  const chunkIds = uniqueStrings(input.chunkIds, input.chunkId);
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const recordIds = uniqueStrings(input.recordIds, input.recordId);
  const nodeIds = uniqueStrings(input.nodeIds, input.nodeId, input.jobIds, input.jobId);
  const edgeIds = uniqueStrings(input.edgeIds, input.edgeId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
  const nodes = normalizeDecisionGraphNodes(input.nodes);
  const edges = normalizeDecisionGraphEdges(input.edges);
  const graphKind = input.graphKind ?? "decision";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.graph",
    recordKind: "frontier.lang.decisionGraph.graph",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("decision-graph", {
      graphKind,
      scopeId: input.scopeId,
      rootId: input.rootId,
      subjectIds: sortedStrings(subjectIds),
      recordIds: sortedStrings(recordIds),
      nodeIds: sortedStrings([...nodeIds, ...nodes.map((node) => node.id)]),
      edgeIds: sortedStrings([...edgeIds, ...edges.map((edge) => edge.id)])
    }),
    graphKind,
    scopeId: input.scopeId,
    rootId: input.rootId,
    status: input.status ?? "open",
    graphIds,
    chunkIds,
    subjectIds,
    recordIds,
    nodeIds: uniqueStrings(nodeIds, nodes.map((node) => node.id)),
    edgeIds: uniqueStrings(edgeIds, edges.map((edge) => edge.id)),
    candidateIds,
    semanticMergeCandidateIds,
    semanticChangeIds,
    admissionDecisionIds,
    decisionIds,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
    nodes,
    edges,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphChunkRecord(input = {}) {
  const graphIds = uniqueStrings(input.graphIds, input.graphId);
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const recordIds = uniqueStrings(input.recordIds, input.recordId, (input.records ?? []).map((record) => record?.id));
  const nodeIds = uniqueStrings(input.nodeIds, input.nodeId, input.jobIds, input.jobId);
  const edgeIds = uniqueStrings(input.edgeIds, input.edgeId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
  const chunkKind = input.chunkKind ?? "records";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.chunk",
    recordKind: "frontier.lang.decisionGraph.chunk",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("decision-graph-chunk", {
      graphIds: sortedStrings(graphIds),
      chunkKind,
      sequence: input.sequence,
      recordIds: sortedStrings(recordIds),
      nodeIds: sortedStrings(nodeIds),
      edgeIds: sortedStrings(edgeIds)
    }),
    graphIds,
    chunkKind,
    sequence: input.sequence,
    status: input.status ?? "open",
    subjectIds,
    recordIds,
    nodeIds,
    edgeIds,
    candidateIds,
    semanticMergeCandidateIds,
    semanticChangeIds,
    admissionDecisionIds,
    decisionIds,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
    records: input.records ?? [],
    payload: input.payload,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphGateRecord(input = {}) {
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
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
    semanticMergeCandidateIds,
    semanticChangeIds,
    admissionDecisionIds,
    decisionIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
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
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
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
    semanticMergeCandidateIds,
    admissionDecisionIds,
    decisionIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
    metadata: input.metadata
  });
}

export function createDecisionGraphSemanticChangeRecord(input = {}) {
  const patchIds = uniqueStrings(input.patchIds, input.patchId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const operationIds = uniqueStrings(input.operationIds, input.operationId);
  const semanticNodeIds = uniqueStrings(input.semanticNodeIds, input.semanticNodeId, input.nodeIds, input.nodeId);
  const semanticSymbolIds = uniqueStrings(input.semanticSymbolIds, input.semanticSymbolId);
  const effectIds = uniqueStrings(input.effectIds, input.effectId);
  const regions = uniqueStrings(input.regions, input.region);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
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
    patchEventIds,
    operationIds,
    semanticNodeIds,
    semanticSymbolIds,
    effectIds,
    regions,
    risk: input.risk,
    evidenceIds,
    admissionDecisionIds,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphPatchEventRecord(input = {}) {
  const patchIds = uniqueStrings(input.patchIds, input.patchId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const operationIds = uniqueStrings(input.operationIds, input.operationId);
  const status = input.status ?? "unknown";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.patchEvent",
    recordKind: "frontier.lang.decisionGraph.patchEvent",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("patch-event", {
      eventId: input.eventId,
      patchIds: sortedStrings(patchIds),
      replayRecordIds: sortedStrings(replayRecordIds),
      baseHash: input.baseHash,
      targetHash: input.targetHash
    }),
    eventId: input.eventId,
    patchId: input.patchId,
    patchIds,
    status,
    actor: input.actor,
    at: input.at,
    baseHash: input.baseHash,
    targetHash: input.targetHash,
    operationIds,
    semanticChangeIds,
    admissionDecisionIds,
    replayRecordIds,
    gateIds,
    evidenceIds,
    deterministic: input.deterministic,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphAdmissionDecisionRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId, candidateIds);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const conflictKeys = uniqueStrings(input.conflictKeys, input.conflictKey);
  const conflictKeyKinds = uniqueStrings(input.conflictKeyKinds, input.conflictKeyKind);
  const reasons = uniqueStrings(input.reasons, input.reason);
  const classification = input.classification ?? "review-required";
  const decision = input.decision ?? admissionClassificationDecision(classification);
  return compactRecord({
    kind: "frontier.lang.decisionGraph.admissionDecision",
    recordKind: "frontier.lang.decisionGraph.admissionDecision",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("admission-decision", {
      admissionId: input.admissionId,
      semanticMergeCandidateIds: sortedStrings(semanticMergeCandidateIds),
      classification,
      decision
    }),
    admissionId: input.admissionId,
    candidateId: input.candidateId,
    candidateIds,
    semanticMergeCandidateIds,
    semanticChangeIds,
    classification,
    decision,
    status: admissionDecisionStatus(input.status, classification, decision),
    autoMergeable: Boolean(input.autoMergeable ?? classification === "safe"),
    conflictKeys,
    conflictKeyKinds,
    gateIds,
    evidenceIds,
    patchEventIds,
    replayRecordIds,
    reasons,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphCandidateDecisionRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId, candidateIds);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
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
    semanticMergeCandidateIds,
    semanticChangeIds,
    admissionDecisionIds,
    decision,
    status: decisionStatus(input.status, decision),
    score: input.score,
    rank: input.rank,
    gateIds,
    evidenceIds,
    patchEventIds,
    replayRecordIds,
    tournamentRecordIds,
    rsiLoopIds,
    reviewerIds,
    reasons,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphMergeDecisionRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId, candidateIds);
  const candidateDecisionIds = uniqueStrings(input.candidateDecisionIds, input.candidateDecisionId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
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
    semanticMergeCandidateIds,
    candidateDecisionIds,
    semanticChangeIds,
    admissionDecisionIds,
    baseHash: input.baseHash,
    targetHash: input.targetHash,
    conflictKeys,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
    reasons,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphReplayRecord(input = {}) {
  const eventIds = uniqueStrings(input.eventIds, input.eventId);
  const patchIds = uniqueStrings(input.patchIds, input.patchId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
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
    patchEventIds,
    semanticChangeIds,
    admissionDecisionIds,
    gateIds,
    evidenceIds,
    decisionIds,
    issues,
    steps: input.steps ?? [],
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphTournamentRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId, candidateIds);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentCandidateIds = uniqueStrings(input.tournamentCandidateIds, input.tournamentCandidateId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
  const tournamentKind = input.tournamentKind ?? "candidate-scoring";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.tournament",
    recordKind: "frontier.lang.decisionGraph.tournament",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("tournament-record", {
      tournamentId: input.tournamentId,
      tournamentKind,
      candidateIds: sortedStrings(candidateIds),
      semanticMergeCandidateIds: sortedStrings(semanticMergeCandidateIds),
      admissionDecisionIds: sortedStrings(admissionDecisionIds)
    }),
    tournamentId: input.tournamentId,
    tournamentKind,
    status: input.status ?? "open",
    winnerCandidateId: input.winnerCandidateId,
    candidateIds,
    semanticMergeCandidateIds,
    admissionDecisionIds,
    decisionIds,
    semanticChangeIds,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentCandidateIds,
    rsiLoopIds,
    scoring: input.scoring,
    metrics: input.metrics,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphTournamentCandidateRecord(input = {}) {
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId, candidateIds);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
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
    candidateIds,
    semanticMergeCandidateIds,
    admissionDecisionIds,
    semanticChangeIds,
    gateIds,
    evidenceIds,
    decisionIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphPanelProjectionRecord(input = {}) {
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const candidateIds = uniqueStrings(input.candidateIds, input.candidateId);
  const semanticMergeCandidateIds = uniqueStrings(input.semanticMergeCandidateIds, input.semanticMergeCandidateId, candidateIds);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const mergeDecisionIds = uniqueStrings(input.mergeDecisionIds, input.mergeDecisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId);
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
    semanticMergeCandidateIds,
    admissionDecisionIds,
    mergeDecisionIds,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
    fields,
    projection: input.projection,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphRsiLoopRecord(input = {}) {
  const subjectIds = uniqueStrings(input.subjectIds, input.subjectId);
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const feedbackIds = uniqueStrings(input.feedbackIds, input.feedbackId);
  const loopKind = input.loopKind ?? "rsi";
  return compactRecord({
    kind: "frontier.lang.decisionGraph.rsiLoop",
    recordKind: "frontier.lang.decisionGraph.rsiLoop",
    version: 1,
    id: input.id ?? stableDecisionGraphRecordId("rsi-loop", {
      loopId: input.loopId,
      loopKind,
      iteration: input.iteration,
      subjectIds: sortedStrings(subjectIds),
      admissionDecisionIds: sortedStrings(admissionDecisionIds),
      decisionIds: sortedStrings(decisionIds)
    }),
    loopId: input.loopId,
    loopKind,
    iteration: input.iteration,
    status: input.status ?? "open",
    objective: input.objective,
    action: input.action,
    subjectIds,
    semanticChangeIds,
    admissionDecisionIds,
    decisionIds,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    feedbackIds,
    feedback: input.feedback,
    summary: input.summary,
    metadata: input.metadata
  });
}

export function createDecisionGraphImprovementFeedbackRecord(input = {}) {
  const semanticChangeIds = uniqueStrings(input.semanticChangeIds, input.semanticChangeId);
  const admissionDecisionIds = uniqueStrings(input.admissionDecisionIds, input.admissionDecisionId);
  const decisionIds = uniqueStrings(input.decisionIds, input.decisionId);
  const gateIds = uniqueStrings(input.gateIds, input.gateId);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const replayRecordIds = uniqueStrings(input.replayRecordIds, input.replayRecordId);
  const patchEventIds = uniqueStrings(input.patchEventIds, input.patchEventId);
  const tournamentRecordIds = uniqueStrings(input.tournamentRecordIds, input.tournamentRecordId);
  const rsiLoopIds = uniqueStrings(input.rsiLoopIds, input.rsiLoopId, input.loopId);
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
    admissionDecisionIds,
    decisionIds,
    gateIds,
    evidenceIds,
    replayRecordIds,
    patchEventIds,
    tournamentRecordIds,
    rsiLoopIds,
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

function admissionClassificationDecision(classification) {
  if (classification === "safe" || classification === "safe-with-losses") return "merge";
  if (classification === "blocked") return "blocked";
  return "needs-review";
}

function admissionDecisionStatus(status, classification, decision) {
  if (status) return status;
  if (classification === "safe" || classification === "safe-with-losses") return "passed";
  if (classification === "blocked") return "failed";
  return decisionStatus(status, decision);
}

function normalizeDecisionGraphNodes(nodes = []) {
  return nodes.map((node) => {
    const nodeKind = node?.nodeKind ?? node?.kind ?? "record";
    return compactRecord({
      id: node?.id ?? stableDecisionGraphRecordId("decision-node", {
        nodeKind,
        recordId: node?.recordId,
        label: node?.label
      }),
      nodeKind,
      recordId: node?.recordId,
      label: node?.label,
      status: node?.status,
      metadata: node?.metadata
    });
  });
}

function normalizeDecisionGraphEdges(edges = []) {
  return edges.map((edge) => {
    const edgeKind = edge?.edgeKind ?? edge?.kind ?? "relates-to";
    const fromId = edge?.fromId ?? edge?.sourceId;
    const toId = edge?.toId ?? edge?.targetId;
    return compactRecord({
      id: edge?.id ?? stableDecisionGraphRecordId("decision-edge", {
        edgeKind,
        fromId,
        toId
      }),
      edgeKind,
      fromId,
      toId,
      status: edge?.status,
      metadata: edge?.metadata
    });
  });
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
