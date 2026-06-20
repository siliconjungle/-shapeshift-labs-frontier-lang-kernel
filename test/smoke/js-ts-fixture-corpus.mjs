import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import {
  classifyMerge,
  classifySemanticMergeCandidate,
  createDocument,
  createPatch
} from '../../dist/index.js';

const fixturesUrl = new URL('../fixtures/js-ts-semantic-merge/', import.meta.url);
const requiredOutcomes = new Set([
  'safe-import',
  'unsafe-import',
  'safe-top-level-add',
  'same-name-conflict',
  'safe-member-add',
  'computed-member-conflict',
  'no-op-roundtrip'
]);

const files = (await readdir(fixturesUrl))
  .filter((file) => file.endsWith('.json'))
  .sort();
assert.ok(files.length >= requiredOutcomes.size, 'fixture corpus should include the required JS/TS cases');

const observedOutcomes = new Set();
for (const file of files) {
  const fixtureUrl = new URL(file, fixturesUrl);
  const fileStat = await stat(fixtureUrl);
  assert.ok(fileStat.size < 10_000, `${file} should stay compact for dashboard evidence`);

  const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  assert.equal(fixture.kind, 'frontier.lang.fixture.semanticMergeCase', `${file} kind`);
  assert.equal(fixture.version, 1, `${file} version`);
  assert.equal(`${fixture.id}.json`, file, `${file} name should match fixture id`);
  assert.ok(['javascript', 'typescript'].includes(fixture.language), `${file} language`);
  assert.equal(typeof fixture.title, 'string', `${file} title`);
  assert.equal(typeof fixture.category, 'string', `${file} category`);
  assert.equal(typeof fixture.source?.base, 'string', `${file} source.base`);
  assert.equal(typeof fixture.source?.left, 'string', `${file} source.left`);
  assert.equal(typeof fixture.source?.right, 'string', `${file} source.right`);
  assert.ok(sourceSize(fixture.source) < 1_500, `${file} should keep source snippets small`);

  assert.ok(requiredOutcomes.has(fixture.expected?.outcome), `${file} expected outcome should be known`);
  assert.equal(typeof fixture.expected?.summary, 'string', `${file} expected summary`);
  assert.equal(typeof fixture.expected?.autoMergeable, 'boolean', `${file} expected autoMergeable`);
  assert.ok(['safe', 'review-required', 'conflict'].includes(fixture.expected?.decision), `${file} expected decision`);
  observedOutcomes.add(fixture.expected.outcome);

  if (fixture.oracle?.kind === 'semantic-candidate-admission') {
    validateSemanticCandidateAdmissionFixture(fixture, file);
    continue;
  }
  if (fixture.oracle?.kind === 'patch-merge') {
    validatePatchMergeFixture(fixture, file);
    continue;
  }
  assert.fail(`${file} has unsupported oracle kind ${fixture.oracle?.kind}`);
}

for (const outcome of requiredOutcomes) {
  assert.ok(observedOutcomes.has(outcome), `missing JS/TS fixture outcome ${outcome}`);
}

function validateSemanticCandidateAdmissionFixture(fixture, file) {
  const admission = classifySemanticMergeCandidate({
    candidate: fixture.oracle.candidate,
    ...(fixture.oracle.admissionOptions ?? {})
  });
  assert.equal(admission.classification, fixture.expected.admission.classification, `${file} admission classification`);
  assert.equal(admission.autoMergeable, fixture.expected.autoMergeable, `${file} admission autoMergeable`);
  for (const kind of fixture.expected.admission.includesConflictKeyKinds ?? []) {
    assert.ok(admission.conflictKeyKinds.includes(kind), `${file} admission should include ${kind} conflict keys`);
  }
  assertReasonIncludes(admission.reasons, fixture.expected.admission.reasonIncludes, file);
}

function validatePatchMergeFixture(fixture, file) {
  const base = createDocument(fixture.oracle.baseDocument);
  const left = createPatch(fixture.oracle.leftPatch);
  const right = createPatch(fixture.oracle.rightPatch);
  const result = classifyMerge(base, left, right);
  const expected = fixture.expected.merge;
  assert.equal(result.status, expected.status, `${file} merge status`);
  assert.equal(result.autoMergeable, fixture.expected.autoMergeable, `${file} merge autoMergeable`);
  assert.deepEqual(result.overlappingNodeIds, expected.overlappingNodeIds, `${file} overlapping nodes`);
  assert.deepEqual(result.overlappingRegions, expected.overlappingRegions, `${file} overlapping regions`);
  assert.deepEqual(result.overlappingEffects, expected.overlappingEffects, `${file} overlapping effects`);
  assertReasonIncludes(result.reasons, expected.reasonIncludes, file);
}

function assertReasonIncludes(reasons, expectedNeedles = [], file) {
  const text = reasons.join('\n');
  for (const needle of expectedNeedles) {
    assert.match(text, new RegExp(escapeRegExp(needle), 'i'), `${file} reason should include ${needle}`);
  }
}

function sourceSize(source) {
  return ['base', 'left', 'right'].reduce((total, key) => total + source[key].length, 0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
