import assert from 'node:assert/strict';
import {
  collectPatchEvidence,
  NativeAstLossKinds,
  ParadigmSemanticsRecordGroups,
  ProofArtifactKinds,
  ProofObligationStatuses,
  ProofSpecContractKinds,
  SourceMapPrecisions,
  SourcePreservationLevels,
  UniversalAstLayerNames,
  UniversalAstReferenceKinds
} from '../../dist/index.js';

assert.equal(NativeAstLossKinds.includes('sourceMapApproximation'), true);
assert.equal(SourceMapPrecisions.includes('declaration'), true);
assert.equal(SourcePreservationLevels.includes('blocked'), true);
assert.equal(UniversalAstLayerNames.includes('runtimeModel'), true);
assert.equal(UniversalAstLayerNames.includes('proofSpec'), true);
assert.equal(UniversalAstLayerNames.includes('paradigmSemantics'), true);
assert.equal(UniversalAstReferenceKinds.includes('paradigmRecord'), true);
assert.equal(ProofSpecContractKinds.includes('precondition'), true);
assert.equal(ProofObligationStatuses.includes('discharged'), true);
assert.equal(ProofArtifactKinds.includes('solverRun'), true);
assert.equal(ParadigmSemanticsRecordGroups.includes('stackEffects'), true);
assert.deepEqual(
  collectPatchEvidence({
    operations: [{ op: 'addEvidence', evidence: { id: 'root_export', kind: 'test', status: 'passed' } }]
  }).map((record) => record.id),
  ['root_export']
);
