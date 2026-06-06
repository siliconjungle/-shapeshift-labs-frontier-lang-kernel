import assert from 'node:assert/strict';
import {
  SemanticOperationKinds,
  classifySemanticMergeCandidate,
  createSemanticOperationRecord,
  createSemanticOperationSet,
  createUniversalAstEnvelope,
  semanticOperationToMergeCandidate,
  validateUniversalAstEnvelope
} from '../../dist/index.js';
import { createUniversalAstFixture } from './universal-fixture.mjs';

assert.equal(SemanticOperationKinds.includes('projection'), true);

const declaration = createSemanticOperationRecord({
  id: 'op_test_declaration',
  operationKind: 'declaration',
  language: 'typescript',
  semanticNodeId: 'ent_todo',
  semanticSymbolId: 'symbol:Todo',
  nativeAstNodeId: 'native_todo_interface',
  sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface',
  evidenceId: 'sourcemap_build',
  readiness: 'ready'
});

assert.equal(declaration.kind, 'frontier.lang.semanticOperation');
assert.deepEqual(declaration.semanticNodeIds, ['ent_todo']);
assert.equal(declaration.autoMergeClaim, false);
assert.equal(declaration.semanticEquivalenceClaim, false);
assert.equal(declaration.ownershipKeys.includes('node:ent_todo'), true);
assert.equal(declaration.conflictKeys.includes('source-map:sourcemap_todo_ts:map_todo_interface'), true);

const dynamicEffect = createSemanticOperationRecord({
  id: 'op_test_dynamic_effect',
  operationKind: 'effect',
  semanticNodeId: 'effect_fetch_todo',
  effectId: 'dynamic',
  dynamic: true,
  readiness: 'needs-review'
});
assert.equal(dynamicEffect.conflictKeys.includes('effect:dynamic'), true);

const mergeCandidate = semanticOperationToMergeCandidate(dynamicEffect);
const admission = classifySemanticMergeCandidate({ candidate: mergeCandidate });
assert.equal(admission.classification, 'review-required');
assert.equal(admission.autoMergeable, false);
assert.match(admission.reasons.join('\n'), /Dynamic effect|requires review/);

const operationSet = createSemanticOperationSet({
  id: 'semantic_operations_test',
  operations: [declaration, dynamicEffect]
});
assert.equal(operationSet.kind, 'frontier.lang.semanticOperationSet');
assert.equal(operationSet.summary.operations, 2);
assert.equal(operationSet.summary.dynamicOperations, 1);
assert.equal(operationSet.summary.autoMergeClaims, 0);
assert.equal(operationSet.summary.semanticEquivalenceClaims, 0);

const { document, semanticIndex, sourceMap } = createUniversalAstFixture();
const envelope = createUniversalAstEnvelope({
  id: 'uast_semantic_operation_test',
  document,
  semanticIndex,
  sourceMaps: [sourceMap],
  semanticOperations: {
    id: 'semantic_operations_declaration_only',
    operations: [declaration]
  },
  evidence: semanticIndex.evidence
});
assert.equal(envelope.semanticOperations.summary.operations, 1);
assert.equal(envelope.layers.semanticOperations.semanticOperationIds.includes('op_test_declaration'), true);
assert.deepEqual(validateUniversalAstEnvelope(envelope), []);
