import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import {
  applySemanticPatch,
  classifyMerge,
  classifySemanticMergeCandidate,
  createDocument,
  createJsTsConflictSidecarRecord,
  createPatch,
  createSourceTriviaLedger,
  hashDocumentBase,
  reconstructSourceRoundtrip,
  scanSourceRoundtrip,
  validateSourceTriviaLedgerRecord,
  verifyNoopSourceRoundtrip
} from '../../dist/index.js';

const fixturesUrl = new URL('../fixtures/js-ts-semantic-merge/', import.meta.url);
const fixtures = await loadFixtures();

const safeFixture = fixture('safe-top-level-add');
const noOpFixture = fixture('no-op-roundtrip');
const conflictFixture = fixture('same-name-conflict');
const safeAdmissionFixture = fixture('safe-import-static-named');
const dynamicAdmissionFixture = fixture('unsafe-import-dynamic');

for (const selectedFixture of [safeFixture, noOpFixture, conflictFixture, safeAdmissionFixture, dynamicAdmissionFixture]) {
  assertRoundtripAndTriviaCoverage(selectedFixture);
}

const safeTerminal = drainSafePatchFixture(safeFixture);
assert.equal(safeTerminal.id, 'safe-top-level-add');
assert.equal(safeTerminal.terminalState, 'applied');
assert.equal(safeTerminal.mergeStatus, 'safe-by-disjoint-region');
assert.equal(safeTerminal.autoMergeable, true);
assert.deepEqual(safeTerminal.appliedPatchIds, ['left_noop_for_top_level_add', 'right_add_settings']);
assert.equal(safeTerminal.outputDocument.nodes.type_settings.name, 'Settings');

const noOpTerminal = drainNoOpFixture(noOpFixture);
assert.equal(noOpTerminal.id, 'no-op-roundtrip');
assert.equal(noOpTerminal.terminalState, 'rejected');
assert.equal(noOpTerminal.mergeStatus, 'safe-by-same-change');
assert.equal(noOpTerminal.roundtripStatus, 'passed');
assert.match(noOpTerminal.reason, /no material change/i);

const staleTerminal = drainStaleNoOpFixture(noOpFixture);
assert.equal(staleTerminal.id, 'no-op-roundtrip:stale');
assert.equal(staleTerminal.terminalState, 'rerun-rejected');
assert.equal(staleTerminal.mergeStatus, 'unknown-needs-review');
assert.equal(staleTerminal.rerun.roundtripStatus, 'passed');
assert.equal(staleTerminal.rerun.terminalState, 'rejected');
assert.match(staleTerminal.reason, /base hash/i);

const conflictTerminal = drainConflictFixture(conflictFixture);
assert.equal(conflictTerminal.id, 'same-name-conflict');
assert.equal(conflictTerminal.terminalState, 'review-required');
assert.equal(conflictTerminal.mergeStatus, 'conflict-by-overlap');
assert.deepEqual(conflictTerminal.overlappingNodeIds, ['type_cache_entry']);
assert.equal(conflictTerminal.sidecar.kind, 'frontier.lang.jsTsMergeConflictSidecar');
assert.equal(conflictTerminal.sidecar.conflictKind, 'declaration');
assert.equal(conflictTerminal.sidecar.sides.length, 2);
assert.equal(conflictTerminal.sidecar.conflictKeys.includes('js-ts:conflict:declaration:declaration:type_cache_entry'), true);

const safeAdmission = classifyFixtureAdmission(safeAdmissionFixture);
assert.equal(safeAdmission.classification, 'safe');
assert.equal(safeAdmission.autoMergeable, true);
assert.equal(safeAdmission.conflictKeyKinds.includes('signature'), true);

const dynamicAdmission = classifyFixtureAdmission(dynamicAdmissionFixture);
assert.equal(dynamicAdmission.classification, 'review-required');
assert.equal(dynamicAdmission.autoMergeable, false);
assert.equal(dynamicAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.dynamic-effect'), true);
assert.equal(dynamicAdmission.conflicts.some((conflict) => conflict.code === 'semantic-merge.opaque-or-dynamic'), true);

const terminalSummary = [
  safeTerminal,
  noOpTerminal,
  staleTerminal,
  conflictTerminal
].map((entry) => [entry.id, entry.terminalState]);
assert.deepEqual(terminalSummary, [
  ['safe-top-level-add', 'applied'],
  ['no-op-roundtrip', 'rejected'],
  ['no-op-roundtrip:stale', 'rerun-rejected'],
  ['same-name-conflict', 'review-required']
]);

function drainSafePatchFixture(selectedFixture) {
  const { base, left, right, result } = classifyPatchFixture(selectedFixture);
  assert.equal(result.autoMergeable, true);

  const outputDocument = applySemanticPatch(applySemanticPatch(base, left), right);
  return {
    id: selectedFixture.id,
    terminalState: 'applied',
    mergeStatus: result.status,
    autoMergeable: result.autoMergeable,
    appliedPatchIds: [left.id, right.id],
    outputDocument
  };
}

function drainNoOpFixture(selectedFixture) {
  const { result } = classifyPatchFixture(selectedFixture);
  const roundtrip = verifyNoopSourceRoundtrip({
    reportId: `e2e:${selectedFixture.id}:noop`,
    evidenceId: `evidence:e2e:${selectedFixture.id}:noop`,
    path: fixtureSourcePath(selectedFixture, 'base'),
    language: selectedFixture.language,
    sourceText: selectedFixture.source.base
  });

  assert.equal(result.autoMergeable, true);
  assert.equal(selectedFixture.source.base, selectedFixture.source.left);
  assert.equal(selectedFixture.source.base, selectedFixture.source.right);

  return {
    id: selectedFixture.id,
    terminalState: 'rejected',
    mergeStatus: result.status,
    roundtripStatus: roundtrip.status,
    reason: 'No material change after no-op source roundtrip.'
  };
}

function drainStaleNoOpFixture(selectedFixture) {
  const base = createDocument(selectedFixture.oracle.baseDocument);
  const left = createPatch({
    ...selectedFixture.oracle.leftPatch,
    baseHash: 'fnv1a32:stale-output'
  });
  const right = createPatch({
    ...selectedFixture.oracle.rightPatch,
    baseHash: hashDocumentBase(base)
  });
  const result = classifyMerge(base, left, right);
  assert.equal(result.autoMergeable, false);
  assert.equal(result.reasons.some((reason) => /base hash/i.test(reason)), true);

  const rerun = drainNoOpFixture(selectedFixture);
  return {
    id: `${selectedFixture.id}:stale`,
    terminalState: 'rerun-rejected',
    mergeStatus: result.status,
    reason: result.reasons.join('\n'),
    rerun
  };
}

function drainConflictFixture(selectedFixture) {
  const { left, right, result } = classifyPatchFixture(selectedFixture);
  assert.equal(result.autoMergeable, false);

  const targetId = result.overlappingNodeIds[0] ?? result.overlappingRegions[0] ?? 'unknown';
  const sidecar = createJsTsConflictSidecarRecord({
    conflictKind: selectedFixture.category === 'member' ? 'member' : 'declaration',
    targetKind: selectedFixture.category === 'member' ? 'member' : 'declaration',
    targetId,
    sides: [
      {
        side: 'left',
        recordId: left.id,
        sourceSpan: sideSpan(selectedFixture, 'left'),
        contentHash: `fixture:${selectedFixture.id}:left`,
        payload: { patchId: left.id }
      },
      {
        side: 'right',
        recordId: right.id,
        sourceSpan: sideSpan(selectedFixture, 'right'),
        contentHash: `fixture:${selectedFixture.id}:right`,
        payload: { patchId: right.id }
      }
    ],
    evidenceId: `evidence:${selectedFixture.id}:conflict-sidecar`
  });

  return {
    id: selectedFixture.id,
    terminalState: 'review-required',
    mergeStatus: result.status,
    overlappingNodeIds: result.overlappingNodeIds,
    overlappingRegions: result.overlappingRegions,
    sidecar
  };
}

function classifyPatchFixture(selectedFixture) {
  const base = createDocument(selectedFixture.oracle.baseDocument);
  const left = createPatch(selectedFixture.oracle.leftPatch);
  const right = createPatch(selectedFixture.oracle.rightPatch);
  const result = classifyMerge(base, left, right);
  return { base, left, right, result };
}

function classifyFixtureAdmission(selectedFixture) {
  assert.equal(selectedFixture.oracle.kind, 'semantic-candidate-admission');
  return classifySemanticMergeCandidate({
    candidate: selectedFixture.oracle.candidate,
    ...(selectedFixture.oracle.admissionOptions ?? {})
  });
}

function assertRoundtripAndTriviaCoverage(selectedFixture) {
  for (const side of ['base', 'left', 'right']) {
    const sourceText = selectedFixture.source[side];
    const path = fixtureSourcePath(selectedFixture, side);
    const scan = scanSourceRoundtrip({
      id: `e2e:${selectedFixture.id}:${side}:scan`,
      path,
      language: selectedFixture.language,
      sourceText
    });
    const reconstructed = reconstructSourceRoundtrip(scan);
    const report = verifyNoopSourceRoundtrip({
      reportId: `e2e:${selectedFixture.id}:${side}:roundtrip`,
      evidenceId: `evidence:e2e:${selectedFixture.id}:${side}:roundtrip`,
      path,
      language: selectedFixture.language,
      sourceText,
      scan
    });
    const ledger = createSourceTriviaLedger({
      id: `e2e:${selectedFixture.id}:${side}:ledger`,
      sourcePath: path,
      language: selectedFixture.language,
      sourceText
    });

    assert.equal(reconstructed, sourceText, `${selectedFixture.id} ${side} reconstructs exactly`);
    assert.equal(report.status, 'passed', `${selectedFixture.id} ${side} roundtrip`);
    assert.deepEqual(validateSourceTriviaLedgerRecord(ledger), [], `${selectedFixture.id} ${side} trivia ledger`);
    assert.ok(scan.segments.length > 0, `${selectedFixture.id} ${side} scanner segments`);
    assert.ok(ledger.conflictKeys.length > 0, `${selectedFixture.id} ${side} trivia conflict keys`);
  }
}

function sideSpan(selectedFixture, side) {
  const sourceText = selectedFixture.source[side];
  const lineCount = sourceText.split('\n').length;
  return {
    path: fixtureSourcePath(selectedFixture, side),
    startLine: 1,
    startColumn: 1,
    endLine: lineCount,
    endColumn: sourceText.split('\n').at(-1).length + 1
  };
}

function fixtureSourcePath(selectedFixture, side) {
  const extension = selectedFixture.language === 'typescript' ? 'ts' : 'js';
  return `test/fixtures/js-ts-semantic-merge/${selectedFixture.id}.${side}.${extension}`;
}

function fixture(id) {
  const selectedFixture = fixtures.get(id);
  assert.ok(selectedFixture, `missing fixture ${id}`);
  return selectedFixture;
}

async function loadFixtures() {
  const files = (await readdir(fixturesUrl))
    .filter((file) => file.endsWith('.json'))
    .sort();
  const records = new Map();
  for (const file of files) {
    const record = JSON.parse(await readFile(new URL(file, fixturesUrl), 'utf8'));
    records.set(record.id, record);
  }
  return records;
}
