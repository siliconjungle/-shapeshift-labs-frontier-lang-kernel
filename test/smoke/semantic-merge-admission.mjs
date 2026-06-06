import assert from 'node:assert/strict';
import {
  classifySemanticMergeCandidate,
  collectSemanticMergeAdmissionConflictKeys
} from '../../dist/index.js';
import { createUniversalAstFixture } from './universal-fixture.mjs';

const { nativeAst, sourceMap, semanticIndex, universalAst } = createUniversalAstFixture();
const projectionCandidate = universalAst.mergeCandidates[0];
const admissionConflictKeys = collectSemanticMergeAdmissionConflictKeys(projectionCandidate, {
  nativeAst,
  semanticIndex,
  sourceMaps: [sourceMap],
  regions: ['field_title'],
  effects: ['http.request']
});

assert.equal(admissionConflictKeys.includes('symbol:symbol:Todo'), true);
assert.equal(admissionConflictKeys.includes('region:field_title'), true);
assert.equal(admissionConflictKeys.includes('effect:http.request'), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('native:src/todo.ts:1:1:4:2:native_todo_interface')), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('ast-subtree:src/todo.ts:fnv1a32:')), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('generated:generated/todo.ts:1:1:4:2:native_todo_interface:typescript:node')), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('sig:typescript:symbol:Todo:fnv1a32:example')), true);

const safeConflictKeys = admissionConflictKeys.filter((key) => !key.startsWith('effect:'));
const safeCandidate = {
  ...projectionCandidate,
  id: 'merge_projection_safe',
  readiness: 'ready',
  conflictKeys: safeConflictKeys,
  reasons: ['Projection candidate has deterministic semantic, native, subtree, and generated-output anchors.'],
  evidence: [{ id: 'safe_merge_admission', kind: 'test', status: 'passed' }]
};
const safeAdmission = classifySemanticMergeCandidate({
  candidate: safeCandidate,
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(safeAdmission.kind, 'frontier.lang.semanticMergeAdmission');
assert.equal(safeAdmission.classification, 'safe');
assert.equal(safeAdmission.autoMergeable, true);
assert.equal(safeAdmission.conflictKeyKinds.includes('generated-output'), true);
assert.match(safeAdmission.reasons.join('\n'), /Stable conflict keys cover/);

const safeWithLossesAdmission = classifySemanticMergeCandidate({
  candidate: { ...safeCandidate, id: 'merge_projection_lossy', readiness: 'ready-with-losses' },
  losses: nativeAst.losses
});
assert.equal(safeWithLossesAdmission.classification, 'safe-with-losses');
assert.equal(safeWithLossesAdmission.autoMergeable, false);
assert.match(safeWithLossesAdmission.reasons.join('\n'), /Non-blocking loss/);

for (const effect of ['http.request', 'dynamic']) {
  const admission = classifySemanticMergeCandidate({ candidate: safeCandidate, effects: [effect] });
  assert.equal(admission.classification, 'review-required');
  assert.equal(admission.autoMergeable, false);
  assert.match(admission.reasons.join('\n'), effect === 'dynamic' ? /Dynamic effect/ : /Effect conflict key/);
}

const blockedAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_failed',
    evidence: [{ id: 'failed_merge_check', kind: 'test', status: 'failed' }]
  }
});
assert.equal(blockedAdmission.classification, 'blocked');
assert.equal(blockedAdmission.autoMergeable, false);
assert.match(blockedAdmission.reasons.join('\n'), /failed_merge_check/);
