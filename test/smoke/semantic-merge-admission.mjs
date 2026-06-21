import assert from 'node:assert/strict';
import {
  JS_TS_MERGE_CONFLICT_REASON_CODES,
  classifySemanticMergeCandidate,
  collectSemanticMergeAdmissionConflictKeys,
  createJsTsMergeContractRecord,
  createJsTsSafeMergeApplyRecord
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
assert.equal(JS_TS_MERGE_CONFLICT_REASON_CODES.includes('js-ts.duplicate-member'), true);

const structuredConflictContract = createJsTsMergeContractRecord({
  id: 'contract_structured_duplicate_member',
  contractKind: 'member',
  language: 'typescript',
  sourcePath: 'src/todo.ts',
  safe: true,
  requiredEvidenceIds: ['safe_merge_admission'],
  conflictSidecars: [{
    code: 'js-ts.duplicate-member',
    conflictKind: 'duplicate-member',
    targetKind: 'member',
    targetId: 'member_title',
    sides: [
      {
        side: 'left',
        recordId: 'member_title',
        sourceSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 3, endLine: 4, endColumn: 17 },
        payload: { type: 'string' }
      },
      {
        side: 'right',
        recordId: 'member_title',
        sourceSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 3, endLine: 4, endColumn: 17 },
        payload: { type: 'Text' }
      }
    ]
  }]
});
const structuredSidecarAdmission = classifySemanticMergeCandidate({
  candidate: safeCandidate,
  mergeContracts: [structuredConflictContract]
});
assert.equal(structuredSidecarAdmission.classification, 'blocked');
const structuredAdmissionConflict = structuredSidecarAdmission.conflicts.find((conflict) => conflict.code === 'js-ts.duplicate-member');
assert.equal(structuredAdmissionConflict.severity, 'error');
assert.equal(structuredAdmissionConflict.affectedContractIds.includes('contract_structured_duplicate_member'), true);
assert.equal(structuredAdmissionConflict.affectedContractIds.includes('member_title'), true);
assert.equal(structuredAdmissionConflict.sourceSpans[0].path, 'src/todo.ts');
assert.equal(structuredAdmissionConflict.remediationHints[0].action, 'rename-or-merge-member');
assert.equal(structuredAdmissionConflict.metadata.jsTsMergeContractId, 'contract_structured_duplicate_member');
assert.deepEqual(structuredAdmissionConflict.metadata.jsTsConflictSideIdentities, ['left', 'right']);
assert.equal(structuredAdmissionConflict.metadata.jsTsConflictSidecar.sides[1].payload.type, 'Text');
const structuredContractMetadata = structuredSidecarAdmission.metadata.jsTsMergeContracts
  .find((contract) => contract.id === 'contract_structured_duplicate_member');
assert.equal(structuredContractMetadata.conflictSidecars[0].code, 'js-ts.duplicate-member');
assert.equal(structuredContractMetadata.conflictSidecars[0].affectedSpans[0].path, 'src/todo.ts');
assert.match(structuredSidecarAdmission.reasons.join('\n'), /duplicate member conflict/);

const safeApplyInput = {
  id: 'apply_safe_member',
  language: 'typescript',
  sourcePath: 'src/todo.ts',
  safeCaseKind: 'member',
  changed: true,
  operationCount: 1,
  baseHash: 'fnv1a32:base',
  currentBaseHash: 'fnv1a32:base',
  targetHash: 'fnv1a32:target',
  contractIds: ['contract_safe_member'],
  requiredEvidenceIds: ['safe_merge_admission']
};
const directSafeApply = createJsTsSafeMergeApplyRecord({
  ...safeApplyInput,
  candidateId: safeCandidate.id,
  language: 'typescript',
  sourcePath: 'src/todo.ts',
  conflictKeys: safeConflictKeys,
  evidence: safeCandidate.evidence
});
assert.equal(directSafeApply.kind, 'frontier.lang.jsTsSafeMergeApply');
assert.equal(directSafeApply.classification, 'safe-apply');
assert.equal(directSafeApply.decision, 'accept');
assert.equal(directSafeApply.autoApplyable, true);
assert.equal(directSafeApply.noOp, false);
assert.deepEqual(directSafeApply.passedEvidenceIds, ['safe_merge_admission']);

const safeApplyAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_safe_apply',
    metadata: {
      semanticMergeContract: safeContract,
      jsTsSafeMergeApplyRecord: safeApplyInput
    }
  },
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-preservation', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(safeApplyAdmission.classification, 'safe');
assert.equal(safeApplyAdmission.autoMergeable, true);
assert.equal(safeApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].classification, 'safe-apply');
assert.equal(safeApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].decision, 'accept');
assert.equal(safeApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].autoApplyable, true);
assert.equal(safeApplyAdmission.metadata.jsTsSafeMergeApplySummary.decisions.accept, 1);
assert.match(safeApplyAdmission.reasons.join('\n'), /apply_safe_member accepts member changes/);

const noOpApplyAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_apply_noop',
    metadata: {
      semanticMergeContract: safeContract,
      jsTsSafeMergeApplyRecord: {
        ...safeApplyInput,
        id: 'apply_noop_member',
        changed: false,
        operationCount: 0
      }
    }
  },
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-preservation', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(noOpApplyAdmission.classification, 'blocked');
assert.equal(noOpApplyAdmission.autoMergeable, false);
assert.equal(noOpApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].classification, 'no-op');
assert.equal(noOpApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].decision, 'reject');
assert.equal(
  noOpApplyAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.apply-gate-no-op'),
  true
);
assert.match(noOpApplyAdmission.reasons.join('\n'), /no source or semantic change/);

const staleApplyAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_apply_stale',
    metadata: {
      semanticMergeContract: safeContract,
      jsTsSafeMergeApplyRecord: {
        ...safeApplyInput,
        id: 'apply_stale_member',
        baseHash: 'fnv1a32:old',
        currentBaseHash: 'fnv1a32:new'
      }
    }
  },
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-preservation', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(staleApplyAdmission.classification, 'blocked');
assert.equal(staleApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].classification, 'stale');
assert.equal(staleApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].decision, 'reject');
assert.equal(
  staleApplyAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.apply-gate-stale' && conflict.severity === 'error'),
  true
);
assert.match(staleApplyAdmission.reasons.join('\n'), /expected base fnv1a32:old, current base fnv1a32:new/);

const conflictApplyAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_apply_conflict',
    metadata: {
      semanticMergeContract: safeContract,
      jsTsSafeMergeApplyRecord: {
        ...safeApplyInput,
        id: 'apply_conflict_member',
        conflicts: [{
          id: 'member_signature_conflict',
          conflictKeys: ['node:ent_todo'],
          reason: 'Member signature differs from the queued apply record.'
        }]
      }
    }
  },
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-preservation', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(conflictApplyAdmission.classification, 'review-required');
assert.equal(conflictApplyAdmission.autoMergeable, false);
assert.equal(conflictApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].classification, 'review-required');
assert.equal(conflictApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].decision, 'review');
assert.equal(
  conflictApplyAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.apply-gate-review'),
  true
);
assert.match(conflictApplyAdmission.reasons.join('\n'), /unresolved conflict metadata/);

const blockedEvidenceApplyAdmission = classifySemanticMergeCandidate({
  candidate: {
    ...safeCandidate,
    id: 'merge_projection_apply_blocked_evidence',
    metadata: {
      semanticMergeContract: safeContract,
      jsTsSafeMergeApplyRecord: {
        ...safeApplyInput,
        id: 'apply_blocked_evidence_member',
        requiredEvidenceIds: ['apply_gate_check'],
        evidence: [{ id: 'apply_gate_check', kind: 'test', status: 'failed' }]
      }
    }
  },
  requiredConflictKeyKinds: ['symbol', 'region', 'native-span', 'source-preservation', 'source-subtree', 'generated-output', 'signature']
});
assert.equal(blockedEvidenceApplyAdmission.classification, 'blocked');
assert.equal(blockedEvidenceApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].classification, 'blocked-evidence');
assert.equal(blockedEvidenceApplyAdmission.metadata.jsTsSafeMergeApplyRecords[0].decision, 'block');
assert.equal(blockedEvidenceApplyAdmission.evidence.some((record) => record.id === 'apply_gate_check'), true);
assert.equal(
  blockedEvidenceApplyAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.apply-gate-blocked-evidence'),
  true
);
assert.equal(
  blockedEvidenceApplyAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.failed-evidence'),
  true
);

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
