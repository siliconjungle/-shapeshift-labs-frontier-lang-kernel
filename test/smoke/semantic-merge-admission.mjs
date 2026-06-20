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
assert.equal(admissionConflictKeys.some((key) => key.startsWith('source-preservation:sourcemap_todo_ts:map_todo_interface:declaration:symbol%3ATodo')), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('ast-subtree:src/todo.ts:fnv1a32:')), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('generated:generated/todo.ts:1:1:4:2:native_todo_interface:typescript:node')), true);
assert.equal(admissionConflictKeys.some((key) => key.startsWith('sig:typescript:symbol:Todo:fnv1a32:example')), true);

const safeConflictKeys = admissionConflictKeys.filter((key) => !key.startsWith('effect:'));
const safeContract = {
  id: 'contract_safe_member',
  kind: 'member',
  language: 'typescript',
  safe: true,
  requiredEvidenceIds: ['safe_merge_admission']
};
const safeCandidate = {
  ...projectionCandidate,
  id: 'merge_projection_safe',
  readiness: 'ready',
  conflictKeys: safeConflictKeys,
  reasons: ['Projection candidate has deterministic semantic, native, subtree, and generated-output anchors.'],
  evidence: [{ id: 'safe_merge_admission', kind: 'test', status: 'passed' }],
  metadata: { semanticMergeContract: safeContract }
};
const safeAdmission = classifySemanticMergeCandidate({
  candidate: safeCandidate,
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-preservation', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(safeAdmission.kind, 'frontier.lang.semanticMergeAdmission');
assert.equal(safeAdmission.classification, 'safe');
assert.equal(safeAdmission.autoMergeable, true);
assert.equal(safeAdmission.conflictKeyKinds.includes('generated-output'), true);
assert.equal(safeAdmission.conflictKeyKinds.includes('source-preservation'), true);
assert.equal(safeAdmission.metadata.jsTsMergeContracts[0].classification, 'safe');
assert.deepEqual(safeAdmission.conflicts, []);
assert.match(safeAdmission.reasons.join('\n'), /Stable conflict keys cover/);
assert.match(safeAdmission.reasons.join('\n'), /contract_safe_member/);

const safeWithLossesAdmission = classifySemanticMergeCandidate({
  candidate: { ...safeCandidate, id: 'merge_projection_lossy', readiness: 'ready-with-losses' },
  losses: nativeAst.losses
});
assert.equal(safeWithLossesAdmission.classification, 'safe-with-losses');
assert.equal(safeWithLossesAdmission.autoMergeable, false);
assert.equal(safeWithLossesAdmission.conflicts[0].code, 'semantic-merge.non-blocking-loss');
assert.equal(safeWithLossesAdmission.conflicts[0].severity, 'info');
assert.match(safeWithLossesAdmission.reasons.join('\n'), /Non-blocking loss/);

const missingSourcePreservationAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_missing_source_preservation',
    conflictKeys: safeConflictKeys.filter((key) => !key.startsWith('source-preservation:'))
  }
});
assert.equal(missingSourcePreservationAdmission.classification, 'review-required');
assert.equal(missingSourcePreservationAdmission.autoMergeable, false);
assert.match(missingSourcePreservationAdmission.reasons.join('\n'), /source-preservation/);
assert.deepEqual(
  missingSourcePreservationAdmission.metadata.jsTsMergeContracts[0].missingRequiredConflictKeyKinds,
  ['source-preservation']
);

const missingEvidenceAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_missing_contract_evidence',
    evidence: []
  }
});
assert.equal(missingEvidenceAdmission.classification, 'review-required');
assert.equal(missingEvidenceAdmission.autoMergeable, false);
assert.match(missingEvidenceAdmission.reasons.join('\n'), /missing required evidence: safe_merge_admission/);

const unknownEvidenceAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_unknown_contract_evidence',
    evidence: [{ id: 'safe_merge_admission', kind: 'test', status: 'unknown' }]
  }
});
assert.equal(unknownEvidenceAdmission.classification, 'review-required');
assert.equal(unknownEvidenceAdmission.autoMergeable, false);
assert.match(unknownEvidenceAdmission.reasons.join('\n'), /unknown required evidence: safe_merge_admission/);

const unsafeContractAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_unsafe_contract',
    metadata: { semanticMergeContract: { ...safeContract, id: 'contract_unsafe_member', status: 'unsafe' } }
  }
});
assert.equal(unsafeContractAdmission.classification, 'review-required');
assert.equal(unsafeContractAdmission.autoMergeable, false);
assert.match(unsafeContractAdmission.reasons.join('\n'), /contract_unsafe_member is unsafe/);
assert.equal(unsafeContractAdmission.metadata.jsTsMergeContracts[0].classification, 'review-required');

const blockedContractAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_blocked_contract',
    metadata: { semanticMergeContract: { ...safeContract, id: 'contract_blocked_declaration', kind: 'declaration', status: 'blocked' } }
  }
});
assert.equal(blockedContractAdmission.classification, 'blocked');
assert.equal(blockedContractAdmission.autoMergeable, false);
assert.match(blockedContractAdmission.reasons.join('\n'), /contract_blocked_declaration is blocked/);

for (const effect of ['http.request', 'dynamic']) {
  const admission = classifySemanticMergeCandidate({ candidate: safeCandidate, effects: [effect] });
  assert.equal(admission.classification, 'review-required');
  assert.equal(admission.autoMergeable, false);
  assert.equal(admission.conflicts.length, 1);
  assert.equal(admission.conflicts[0].code, effect === 'dynamic' ? 'semantic-merge.dynamic-effect' : 'semantic-merge.effect-boundary');
  assert.equal(admission.conflicts[0].severity, 'warning');
  assert.equal(admission.conflicts[0].affectedContractIds.includes(effect), true);
  assert.equal(admission.conflicts[0].sourceSpans.some((span) => span.path === 'src/todo.ts'), true);
  assert.equal(admission.conflicts[0].remediationHints.length > 0, true);
  assert.match(admission.reasons.join('\n'), effect === 'dynamic' ? /Dynamic effect/ : /Effect conflict key/);
}

const competingCandidateAdmission = classifySemanticMergeCandidate({
  candidate: safeCandidate,
  competingCandidates: [{
    ...safeCandidate,
    id: 'merge_projection_competing',
    conflictKeys: [...safeCandidate.conflictKeys].reverse()
  }],
  conflicts: [{
    code: 'semantic-merge.external-conflict',
    severity: 'warning',
    affectedContractIds: ['ent_todo'],
    conflictKeys: ['node:ent_todo'],
    sourceSpans: [{ path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 4, endColumn: 2 }],
    competingCandidates: [{ id: 'merge_projection_external', readiness: 'needs-review', conflictKeys: ['node:ent_todo'] }],
    reason: 'External admission queue reports a semantic node overlap.',
    remediationHints: [{ action: 'manual-review', target: 'candidate', targetIds: ['merge_projection_external'] }]
  }]
});
assert.equal(competingCandidateAdmission.classification, 'review-required');
assert.deepEqual(
  competingCandidateAdmission.conflicts.map((conflict) => conflict.code),
  ['semantic-merge.competing-candidate', 'semantic-merge.external-conflict']
);
const competingSidecar = competingCandidateAdmission.conflicts.find((conflict) => conflict.code === 'semantic-merge.competing-candidate');
assert.equal(competingSidecar.competingCandidates.some((candidate) => candidate.id === 'merge_projection_safe'), true);
assert.equal(competingSidecar.competingCandidates.some((candidate) => candidate.id === 'merge_projection_competing'), true);
assert.equal(competingSidecar.conflictKeys.includes('node:ent_todo'), true);

const blockedAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_failed',
    readiness: 'blocked',
    evidence: [{ id: 'failed_merge_check', kind: 'test', status: 'failed' }]
  },
  losses: [{
    id: 'loss_parse_error',
    severity: 'error',
    kind: 'unsupportedSyntax',
    message: 'Parser could not preserve a native declaration.',
    span: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
    semanticSymbolId: 'symbol:Todo'
  }]
});
assert.equal(blockedAdmission.classification, 'blocked');
assert.equal(blockedAdmission.autoMergeable, false);
assert.deepEqual(
  blockedAdmission.conflicts.map((conflict) => conflict.code),
  [
    'semantic-merge.blocking-loss',
    'semantic-merge.failed-evidence',
    'semantic-merge.readiness-blocked'
  ]
);
assert.equal(blockedAdmission.conflicts.every((conflict) => conflict.severity === 'error'), true);
assert.equal(blockedAdmission.conflicts[0].affectedContractIds.includes('symbol:Todo'), true);
assert.equal(blockedAdmission.conflicts[0].sourceSpans.some((span) => span.path === 'src/todo.ts'), true);
assert.equal(blockedAdmission.conflicts[0].remediationHints.some((hint) => hint.action === 'repair-loss'), true);
assert.match(blockedAdmission.reasons.join('\n'), /failed_merge_check/);

const rustAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_rust_compatible',
    language: 'rust',
    evidence: [],
    metadata: {}
  },
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span']
});
assert.equal(rustAdmission.classification, 'safe');
assert.equal(rustAdmission.autoMergeable, true);
