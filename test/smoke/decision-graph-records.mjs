import assert from 'node:assert/strict';
import {
  DECISION_GRAPH_RECORD_KINDS,
  createDecisionGraphAdmissionDecisionRecord,
  createDecisionGraphCandidateDecisionRecord,
  createDecisionGraphChunkRecord,
  createDecisionGraphEvidenceRecord,
  createDecisionGraphGateRecord,
  createDecisionGraphImprovementFeedbackRecord,
  createDecisionGraphMergeDecisionRecord,
  createDecisionGraphPanelProjectionRecord,
  createDecisionGraphPatchEventRecord,
  createDecisionGraphGraphRecord,
  createDecisionGraphReplayRecord,
  createDecisionGraphRsiLoopRecord,
  createDecisionGraphSemanticChangeRecord,
  createDecisionGraphTournamentRecord,
  createDecisionGraphTournamentCandidateRecord,
  stableDecisionGraphRecordId,
  uniqueEvidence
} from '../../dist/index.js';

assert.equal(
  stableDecisionGraphRecordId('decision-smoke', { b: 2, a: 1 }),
  stableDecisionGraphRecordId('decision-smoke', { a: 1, b: 2 })
);

const evidence = createDecisionGraphEvidenceRecord({
  kind: 'test',
  status: 'passed',
  path: 'test/smoke/decision-graph-records.mjs',
  summary: 'Decision graph records smoke test passed.',
  subjectId: 'typed-decision-graph-records',
  semanticMergeCandidateId: 'candidate_a',
  metadata: { command: 'node test/smoke.mjs' }
});
assert.equal(evidence.recordKind, 'frontier.lang.decisionGraph.evidence');
assert.equal(evidence.kind, 'test');
assert.equal(evidence.status, 'passed');
assert.equal(evidence.semanticMergeCandidateIds.includes('candidate_a'), true);
assert.equal(uniqueEvidence([evidence, evidence]).length, 1);

const gate = createDecisionGraphGateRecord({
  gate: 'smoke',
  name: 'decision graph smoke',
  status: 'passed',
  required: true,
  command: 'node test/smoke.mjs',
  evidenceId: evidence.id,
  subjectId: 'typed-decision-graph-records',
  semanticMergeCandidateId: 'candidate_a'
});
const equivalentGate = createDecisionGraphGateRecord({
  gateKind: 'smoke',
  name: 'decision graph smoke',
  subjectIds: ['typed-decision-graph-records'],
  command: 'node test/smoke.mjs'
});
assert.equal(gate.id, equivalentGate.id);

const semanticChange = createDecisionGraphSemanticChangeRecord({
  changeKind: 'patch',
  patchIds: ['patch_b', 'patch_a'],
  semanticNodeId: 'ent_todo',
  effectId: 'http.request',
  region: 'field_title',
  evidenceId: evidence.id,
  baseHash: 'fnv1a32:00000001',
  targetHash: 'fnv1a32:00000002'
});
const equivalentSemanticChange = createDecisionGraphSemanticChangeRecord({
  changeKind: 'patch',
  patchIds: ['patch_a', 'patch_b'],
  semanticNodeIds: ['ent_todo'],
  effectIds: ['http.request'],
  regions: ['field_title'],
  baseHash: 'fnv1a32:00000001',
  targetHash: 'fnv1a32:00000002'
});
assert.equal(semanticChange.id, equivalentSemanticChange.id);

const patchEvent = createDecisionGraphPatchEventRecord({
  eventId: 'event_a',
  patchId: 'patch_a',
  status: 'passed',
  actor: 'codex.impl',
  at: '2026-06-21T00:00:00.000Z',
  baseHash: 'fnv1a32:00000001',
  targetHash: 'fnv1a32:00000002',
  operationId: 'op_upsert_todo',
  semanticChangeId: semanticChange.id,
  gateId: gate.id,
  evidenceId: evidence.id,
  deterministic: true
});
assert.equal(patchEvent.recordKind, 'frontier.lang.decisionGraph.patchEvent');
assert.equal(patchEvent.patchIds.includes('patch_a'), true);

const admissionDecision = createDecisionGraphAdmissionDecisionRecord({
  admissionId: 'merge-admission:candidate_a',
  semanticMergeCandidateId: 'candidate_a',
  semanticChangeId: semanticChange.id,
  classification: 'safe',
  conflictKey: 'node:ent_todo',
  conflictKeyKind: 'semantic-node',
  gateId: gate.id,
  evidenceId: evidence.id,
  patchEventId: patchEvent.id,
  reason: 'Semantic merge admission classified candidate as safe.'
});
assert.equal(admissionDecision.decision, 'merge');
assert.equal(admissionDecision.status, 'passed');
assert.equal(admissionDecision.semanticMergeCandidateIds.includes('candidate_a'), true);

const candidateDecision = createDecisionGraphCandidateDecisionRecord({
  candidateId: 'candidate_a',
  semanticChangeId: semanticChange.id,
  admissionDecisionId: admissionDecision.id,
  decision: 'accepted',
  score: 0.9,
  gateId: gate.id,
  evidenceId: evidence.id,
  patchEventId: patchEvent.id,
  reason: 'All required gates passed.'
});
assert.equal(candidateDecision.status, 'passed');
assert.equal(candidateDecision.admissionDecisionIds.includes(admissionDecision.id), true);

const replay = createDecisionGraphReplayRecord({
  status: 'passed',
  deterministic: true,
  replayComplete: true,
  eventIds: ['event_a', 'event_b'],
  patchIds: ['patch_a', 'patch_b'],
  patchEventId: patchEvent.id,
  semanticChangeId: semanticChange.id,
  admissionDecisionId: admissionDecision.id,
  evidenceId: evidence.id,
  gateId: gate.id,
  finalHash: 'fnv1a32:00000002',
  steps: [{ eventId: 'event_a', patchId: 'patch_a', status: 'passed' }]
});
assert.equal(replay.deterministic, true);
assert.equal(replay.patchEventIds.includes(patchEvent.id), true);

const mergeDecision = createDecisionGraphMergeDecisionRecord({
  candidateId: 'candidate_a',
  candidateDecisionId: candidateDecision.id,
  semanticChangeId: semanticChange.id,
  admissionDecisionId: admissionDecision.id,
  decision: 'merge',
  autoMergeable: true,
  conflictKey: 'node:ent_todo',
  replayRecordId: replay.id,
  patchEventId: patchEvent.id,
  gateId: gate.id,
  evidenceId: evidence.id
});
assert.equal(mergeDecision.autoMergeable, true);

const tournament = createDecisionGraphTournamentRecord({
  id: 'tournament-record:smoke',
  tournamentId: 'tournament_smoke',
  tournamentKind: 'semantic-merge-scoring',
  status: 'closed',
  winnerCandidateId: 'candidate_a',
  semanticMergeCandidateId: 'candidate_a',
  admissionDecisionId: admissionDecision.id,
  decisionId: mergeDecision.id,
  semanticChangeId: semanticChange.id,
  replayRecordId: replay.id,
  patchEventId: patchEvent.id,
  gateId: gate.id,
  evidenceId: evidence.id,
  tournamentCandidateId: 'tournament-candidate:smoke',
  scoring: { gateWeight: 0.5, replayWeight: 0.5 },
  metrics: { score: 0.9 }
});
assert.equal(tournament.recordKind, 'frontier.lang.decisionGraph.tournament');
assert.equal(tournament.tournamentCandidateIds.includes('tournament-candidate:smoke'), true);

const tournamentCandidate = createDecisionGraphTournamentCandidateRecord({
  id: 'tournament-candidate:smoke',
  tournamentId: 'tournament_smoke',
  candidateId: 'candidate_a',
  lane: 'contract',
  taskId: 'typed-decision-graph-records',
  agentId: 'codex.impl',
  rank: 1,
  score: 0.9,
  metrics: { gatesPassed: 1 },
  semanticChangeId: semanticChange.id,
  admissionDecisionId: admissionDecision.id,
  replayRecordId: replay.id,
  patchEventId: patchEvent.id,
  tournamentRecordId: tournament.id,
  evidenceId: evidence.id,
  decisionId: candidateDecision.id
});
assert.equal(tournamentCandidate.recordKind, 'frontier.lang.decisionGraph.tournamentCandidate');

const rsiLoop = createDecisionGraphRsiLoopRecord({
  loopId: 'rsi_smoke',
  loopKind: 'rsi',
  iteration: 1,
  status: 'closed',
  objective: 'Improve semantic merge replay confidence.',
  action: 'promote deterministic graph bridge records',
  subjectId: mergeDecision.id,
  semanticChangeId: semanticChange.id,
  admissionDecisionId: admissionDecision.id,
  decisionId: mergeDecision.id,
  replayRecordId: replay.id,
  patchEventId: patchEvent.id,
  tournamentRecordId: tournament.id,
  gateId: gate.id,
  evidenceId: evidence.id,
  feedbackId: 'feedback_smoke',
  feedback: { nextRun: 'reuse-stable-record-ids' }
});
assert.equal(rsiLoop.recordKind, 'frontier.lang.decisionGraph.rsiLoop');
assert.equal(rsiLoop.admissionDecisionIds.includes(admissionDecision.id), true);

const panelProjection = createDecisionGraphPanelProjectionRecord({
  panelId: 'semantic-merge-dashboard',
  projectionKind: 'candidate-summary',
  status: 'passed',
  subjectId: 'candidate_a',
  candidateId: 'candidate_a',
  admissionDecisionId: admissionDecision.id,
  mergeDecisionId: mergeDecision.id,
  replayRecordId: replay.id,
  patchEventId: patchEvent.id,
  tournamentRecordId: tournament.id,
  rsiLoopId: rsiLoop.id,
  field: 'status',
  projection: { decision: mergeDecision.decision, autoMergeable: true },
  evidenceId: evidence.id
});
assert.equal(panelProjection.fields.includes('status'), true);

const feedback = createDecisionGraphImprovementFeedbackRecord({
  loopId: 'rsi_smoke',
  loopKind: 'rsi',
  feedbackKind: 'verification',
  subjectId: mergeDecision.id,
  severity: 'info',
  status: 'closed',
  action: 'preserve deterministic constructors',
  semanticChangeId: semanticChange.id,
  admissionDecisionId: admissionDecision.id,
  decisionId: mergeDecision.id,
  replayRecordId: replay.id,
  patchEventId: patchEvent.id,
  tournamentRecordId: tournament.id,
  rsiLoopId: rsiLoop.id,
  evidenceId: evidence.id,
  feedback: { nextRun: 'reuse-stable-record-ids' }
});
assert.equal(feedback.loopKind, 'rsi');

const graph = createDecisionGraphGraphRecord({
  graphKind: 'loom-run-merge-replay',
  scopeId: 'loom.runGraphBridge',
  rootId: mergeDecision.id,
  status: 'closed',
  subjectId: 'typed-decision-graph-records',
  recordIds: [
    gate.id,
    evidence.id,
    semanticChange.id,
    patchEvent.id,
    admissionDecision.id,
    candidateDecision.id,
    mergeDecision.id,
    replay.id,
    tournament.id,
    tournamentCandidate.id,
    rsiLoop.id,
    panelProjection.id,
    feedback.id
  ],
  semanticMergeCandidateId: 'candidate_a',
  admissionDecisionId: admissionDecision.id,
  semanticChangeId: semanticChange.id,
  patchEventId: patchEvent.id,
  replayRecordId: replay.id,
  tournamentRecordId: tournament.id,
  rsiLoopId: rsiLoop.id,
  gateId: gate.id,
  evidenceId: evidence.id,
  nodes: [
    { id: 'job:contract', nodeKind: 'job', recordId: mergeDecision.id, status: 'closed' },
    { id: 'artifact:evidence', nodeKind: 'artifact', recordId: evidence.id, status: 'passed' }
  ],
  edges: [
    { id: 'edge:evidence-gates-merge', edgeKind: 'evidences', fromId: evidence.id, toId: gate.id }
  ]
});
assert.equal(graph.recordKind, 'frontier.lang.decisionGraph.graph');
assert.equal(graph.semanticMergeCandidateIds.includes('candidate_a'), true);
assert.equal(graph.admissionDecisionIds.includes(admissionDecision.id), true);
assert.equal(graph.patchEventIds.includes(patchEvent.id), true);
assert.equal(graph.replayRecordIds.includes(replay.id), true);
assert.equal(graph.tournamentRecordIds.includes(tournament.id), true);
assert.equal(graph.rsiLoopIds.includes(rsiLoop.id), true);
assert.equal(graph.nodeIds.includes('job:contract'), true);

const chunk = createDecisionGraphChunkRecord({
  graphId: graph.id,
  chunkKind: 'merge-replay-records',
  sequence: 1,
  status: 'closed',
  records: [admissionDecision, patchEvent, replay, tournament, rsiLoop],
  semanticMergeCandidateId: 'candidate_a',
  admissionDecisionId: admissionDecision.id,
  patchEventId: patchEvent.id,
  replayRecordId: replay.id,
  tournamentRecordId: tournament.id,
  rsiLoopId: rsiLoop.id,
  payload: { chunkPurpose: 'loom-import' }
});
assert.equal(chunk.recordKind, 'frontier.lang.decisionGraph.chunk');
assert.equal(chunk.graphIds.includes(graph.id), true);
assert.equal(chunk.recordIds.includes(admissionDecision.id), true);

const records = [
  graph,
  chunk,
  gate,
  evidence,
  semanticChange,
  patchEvent,
  admissionDecision,
  candidateDecision,
  mergeDecision,
  replay,
  tournament,
  tournamentCandidate,
  rsiLoop,
  panelProjection,
  feedback
];

assert.equal(records.length, DECISION_GRAPH_RECORD_KINDS.length);
assert.deepEqual(
  records.map((record) => record.recordKind).sort(),
  [...DECISION_GRAPH_RECORD_KINDS].sort()
);
for (const record of records) {
  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
  assert.match(record.id, /:/);
}
