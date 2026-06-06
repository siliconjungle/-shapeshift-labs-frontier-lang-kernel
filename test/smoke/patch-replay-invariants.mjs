import assert from 'node:assert/strict';
import {
  classifyMerge,
  createDocument,
  createPatch,
  hashDocumentBase,
  verifyPatchReplayInvariants
} from '../../dist/index.js';
import { createTodoKernelFixture } from './kernel-fixture.mjs';

const { document } = createTodoKernelFixture();
const baseHash = hashDocumentBase(document);

assert.throws(
  () => createDocument({ id: 'mod_duplicate', name: 'Duplicate', nodes: [document.nodes.ent_todo, document.nodes.ent_todo] }),
  /Duplicate semantic node id: ent_todo/
);

const invalidBaseReport = verifyPatchReplayInvariants(document, [{
  id: 'event_invalid_base',
  patch: createPatch({ id: 'patch_invalid_base', baseHash: 'fnv1a32:00000000', operations: [] })
}], { id: 'report_invalid_base' });
assert.equal(invalidBaseReport.status, 'failed');
assert.equal(invalidBaseReport.replayComplete, false);
assert.equal(invalidBaseReport.evidence.kind, 'replay');
assert.match(invalidBaseReport.issues.join('\n'), /base hash/);

const invalidTargetReport = verifyPatchReplayInvariants(document, [{
  id: 'event_invalid_target',
  patch: createPatch({
    id: 'patch_invalid_target',
    baseHash,
    targetHash: 'fnv1a32:00000000',
    operations: [{ op: 'renameNode', id: 'ent_todo', name: 'Task' }]
  })
}], { id: 'report_invalid_target' });
assert.equal(invalidTargetReport.status, 'failed');
assert.equal(invalidTargetReport.replayComplete, false);
assert.match(invalidTargetReport.issues.join('\n'), /target hash/);
assert.match(invalidTargetReport.steps[0].afterHash, /^fnv1a32:/);

const evidencePatch = (id, evidenceId, region) => createPatch({
  id,
  baseHash,
  operations: [{
    op: 'addEvidence',
    evidence: { id: evidenceId, kind: 'test', status: 'passed' },
    touches: [{ id: region, access: 'write' }]
  }]
});
const duplicateIdReport = verifyPatchReplayInvariants(document, [
  { id: 'event_duplicate_id', patch: evidencePatch('patch_duplicate_id', 'evidence_duplicate_a', 'field_title') },
  { id: 'event_duplicate_id', patch: evidencePatch('patch_duplicate_id', 'evidence_duplicate_b', 'field_title') }
], { id: 'report_duplicate_ids' });
assert.equal(duplicateIdReport.status, 'failed');
assert.equal(duplicateIdReport.replayComplete, true);
assert.match(duplicateIdReport.issues.join('\n'), /Duplicate replay event id/);
assert.match(duplicateIdReport.issues.join('\n'), /Duplicate patch id/);

const mergeLawLeft = evidencePatch('patch_merge_law_left', 'merge_law_left', 'field_tags');
const mergeLawRight = evidencePatch('patch_merge_law_right', 'merge_law_right', 'field_tags');
const mergeLawAdmission = classifyMerge(document, mergeLawLeft, mergeLawRight);
assert.equal(mergeLawAdmission.status, 'safe-by-merge-law');
assert.equal(mergeLawAdmission.autoMergeable, true);
assert.deepEqual(mergeLawAdmission.overlappingRegions, ['field_tags']);

const disjointLeft = evidencePatch('patch_disjoint_left', 'disjoint_left', 'field_title');
const disjointRight = evidencePatch('patch_disjoint_right', 'disjoint_right', 'field_tags');
const disjointAdmission = classifyMerge(document, disjointLeft, disjointRight);
assert.equal(disjointAdmission.status, 'safe-by-disjoint-region');
assert.equal(disjointAdmission.autoMergeable, true);
assert.deepEqual(disjointAdmission.overlappingRegions, []);

const disjointReplayReport = verifyPatchReplayInvariants(document, [
  { id: 'event_disjoint_left', patch: disjointLeft },
  { id: 'event_disjoint_right', patch: disjointRight }
], { id: 'report_disjoint_safe_patches' });
assert.equal(disjointReplayReport.status, 'passed');
assert.equal(disjointReplayReport.evidence.status, 'passed');
assert.equal(disjointReplayReport.steps.length, 2);
