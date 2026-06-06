import assert from 'node:assert/strict';
import {
  validateParadigmSemanticsLayer,
  validateProofSpecLayer
} from '../../dist/index.js';
import { createProofParadigmFixture } from './proof-paradigm-fixture.mjs';

const {
  document,
  nativeAst,
  nativeTodo,
  paradigmEvidence,
  paradigmSemantics,
  proofEvidence,
  proofSpec,
  semanticIndex,
  sourceMap
} = createProofParadigmFixture();

assert.deepEqual(validateProofSpecLayer(proofSpec, {
  document,
  semanticIndex,
  sourceMaps: [sourceMap],
  evidence: [...semanticIndex.evidence, proofEvidence]
}), []);
assert.deepEqual(validateParadigmSemanticsLayer(paradigmSemantics, {
  document,
  nativeSources: [nativeTodo],
  nativeAst,
  semanticIndex,
  sourceMaps: [sourceMap],
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence, paradigmEvidence]
}), []);
