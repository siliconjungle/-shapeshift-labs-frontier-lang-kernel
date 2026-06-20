import assert from 'node:assert/strict';
import {
  DECISION_GRAPH_RECORD_KINDS,
  createDecisionGraphCandidateDecisionRecord,
  createDecisionGraphEvidenceRecord,
  createDecisionGraphGateRecord,
  createDecisionGraphImprovementFeedbackRecord,
  createDecisionGraphMergeDecisionRecord,
  createDecisionGraphPanelProjectionRecord,
  createDecisionGraphReplayRecord,
  createDecisionGraphSemanticChangeRecord,
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
  metadata: { command: 'node test/smoke.mjs' }
});
assert.equal(evidence.recordKind, 'frontier.lang.decisionGraph.evidence');
assert.equal(evidence.kind, 'test');
assert.equal(evidence.status, 'passed');
assert.equal(uniqueEvidence([evidence, evidence]).length, 1);

const gate = createDecisionGraphGateRecord({
  gate: 'smoke',
  name: 'decision graph smoke',
  status: 'passed',
  required: true,
  command: 'node test/smoke.mjs',
  evidenceId: evidence.id,
  subjectId: 'typed-decision-graph-records'
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

const candidateDecision = createDecisionGraphCandidateDecisionRecord({
  candidateId: 'candidate_a',
  semanticChangeId: semanticChange.id,
  decision: 'accepted',
  score: 0.9,
  gateId: gate.id,
  evidenceId: evidence.id,
  reason: 'All required gates passed.'
});
assert.equal(candidateDecision.status, 'passed');

const replay = createDecisionGraphReplayRecord({
  status: 'passed',
  deterministic: true,
  replayComplete: true,
  eventIds: ['event_a', 'event_b'],
  patchIds: ['patch_a', 'patch_b'],
  evidenceId: evidence.id,
  gateId: gate.id,
  finalHash: 'fnv1a32:00000002',
  steps: [{ eventId: 'event_a', patchId: 'patch_a', status: 'passed' }]
});
assert.equal(replay.deterministic, true);

const mergeDecision = createDecisionGraphMergeDecisionRecord({
  candidateId: 'candidate_a',
  candidateDecisionId: candidateDecision.id,
  semanticChangeId: semanticChange.id,
  decision: 'merge',
  autoMergeable: true,
  conflictKey: 'node:ent_todo',
  replayRecordId: replay.id,
  gateId: gate.id,
  evidenceId: evidence.id
});
assert.equal(mergeDecision.autoMergeable, true);

const tournamentCandidate = createDecisionGraphTournamentCandidateRecord({
  tournamentId: 'tournament_smoke',
  candidateId: 'candidate_a',
  lane: 'contract',
  taskId: 'typed-decision-graph-records',
  agentId: 'codex.impl',
  rank: 1,
  score: 0.9,
  metrics: { gatesPassed: 1 },
  semanticChangeId: semanticChange.id,
  evidenceId: evidence.id,
  decisionId: candidateDecision.id
});
assert.equal(tournamentCandidate.recordKind, 'frontier.lang.decisionGraph.tournamentCandidate');

const panelProjection = createDecisionGraphPanelProjectionRecord({
  panelId: 'semantic-merge-dashboard',
  projectionKind: 'candidate-summary',
  status: 'passed',
  subjectId: 'candidate_a',
  candidateId: 'candidate_a',
  mergeDecisionId: mergeDecision.id,
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
  decisionId: mergeDecision.id,
  evidenceId: evidence.id,
  feedback: { nextRun: 'reuse-stable-record-ids' }
});
assert.equal(feedback.loopKind, 'rsi');

const records = [
  gate,
  evidence,
  semanticChange,
  candidateDecision,
  mergeDecision,
  replay,
  tournamentCandidate,
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
