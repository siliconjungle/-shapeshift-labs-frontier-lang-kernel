import assert from 'node:assert/strict';
import {
  createParadigmSemanticsLayer,
  createProofSpecLayer,
  createUniversalAstEnvelope,
  createUniversalAstLayer,
  hashUniversalAstEnvelope,
  stableUniversalAstJson,
  validateUniversalAstEnvelope,
  validateUniversalAstLayer
} from '../../dist/index.js';
import { createUniversalAstFixture } from './universal-fixture.mjs';

const { document, semanticIndex, sourceMap, universalAst } = createUniversalAstFixture();

assert.deepEqual(validateUniversalAstEnvelope(universalAst), []);
assert.equal(universalAst.nativeSources[0].id, 'native_source_todo');
assert.equal(universalAst.losses[0].kind, 'unsupportedSyntax');
assert.equal(universalAst.sourceMaps[0].mappings[0].semanticNodeId, 'ent_todo');
assert.equal(universalAst.layers.losslessSource.artifacts[0].kind, 'sourceText');
assert.equal(universalAst.layers.cst.nativeAstNodeIds.includes('native_todo_interface'), true);
assert.equal(universalAst.layers.semanticSymbols.semanticSymbolIds[0], 'symbol:Todo');
assert.equal(universalAst.layers.effects.graph.edges[0].targetId, 'capability_http');
assert.equal(universalAst.layers.controlFlow.graph.entryIds[0], 'cfg_entry');
assert.equal(universalAst.layers.dataFlow.graph.edges[0].kind, 'flowsTo');
assert.equal(universalAst.layers.runtimeModel.runtime.entrypoints[0].effectIds[0], 'http.request');
assert.equal(universalAst.layers.projectionEvidence.sourceMapIds[0], 'sourcemap_todo_ts');
assert.equal(universalAst.layers.mergeEvidence.mergeCandidateIds[0], 'merge_projection_todo');
assert.equal(universalAst.proof.contracts[0].id, 'contract_todo_title_pre');
assert.equal(universalAst.paradigmSemantics.stackEffects[0].id, 'stack_validate_title');
assert.equal(universalAst.layers.proofSpec.references.some((reference) => reference.kind === 'proofObligation' && reference.id === 'obligation_todo_title'), true);
assert.equal(universalAst.layers.paradigmSemantics.records[0].stackEffects, 1);
assert.equal(universalAst.layers.paradigmSemantics.references.some((reference) => reference.kind === 'paradigmRecord' && reference.id === 'lower_ts_to_frontier_todo'), true);
assert.deepEqual(validateUniversalAstLayer(universalAst.layers.controlFlow, { envelope: universalAst }), []);
assert.deepEqual(validateUniversalAstLayer(universalAst.layers.proofSpec, { envelope: universalAst }), []);
assert.deepEqual(validateUniversalAstLayer(universalAst.layers.paradigmSemantics, { envelope: universalAst }), []);
assert.match(stableUniversalAstJson(universalAst), /frontier\.lang\.universalAst/);
assert.match(hashUniversalAstEnvelope(universalAst), /^fnv1a32:/);

const partialUniversalAst = createUniversalAstEnvelope({
  id: 'uast_partial_source_only',
  document,
  layers: {
    losslessSource: createUniversalAstLayer({
      id: 'layer_partial_lossless',
      layer: 'losslessSource',
      nativeSourceIds: ['native_source_todo'],
      artifacts: [{ id: 'artifact_partial_source', kind: 'sourceText', nativeSourceId: 'native_source_todo', text: 'interface Todo {}' }]
    })
  }
});
assert.deepEqual(validateUniversalAstEnvelope(partialUniversalAst), []);

const brokenLayerEnvelope = createUniversalAstEnvelope({
  id: 'uast_broken_layers',
  document,
  semanticIndex,
  sourceMaps: [sourceMap],
  layers: {
    dataFlow: createUniversalAstLayer({
      id: 'layer_broken_data_flow',
      layer: 'dataFlow',
      semanticNodeIds: ['missing_node'],
      semanticSymbolIds: ['missing_symbol'],
      sourceMapIds: ['missing_sourcemap'],
      graph: {
        nodes: [{ id: 'df_start', kind: 'input', semanticNodeId: 'missing_node' }],
        edges: [{ id: 'df_missing_target', kind: 'flowsTo', sourceId: 'df_start', targetId: 'df_missing' }]
      },
      references: [{ kind: 'semanticSymbol', id: 'missing_symbol' }]
    })
  }
});
const brokenLayerIssues = validateUniversalAstEnvelope(brokenLayerEnvelope).join('\n');
assert.match(brokenLayerIssues, /missing semantic node missing_node/);
assert.match(brokenLayerIssues, /missing semantic symbol missing_symbol/);
assert.match(brokenLayerIssues, /missing source map missing_sourcemap/);
assert.match(brokenLayerIssues, /graph edge df_missing_target references missing graph target df_missing/);

const brokenProofEnvelope = createUniversalAstEnvelope({
  id: 'uast_broken_proof',
  document,
  semanticIndex,
  proof: createProofSpecLayer({
    contracts: [{
      id: 'contract_missing_node',
      kind: 'precondition',
      subjectKind: 'semanticNode',
      subjectId: 'missing_node',
      expression: 'true'
    }]
  })
});
assert.match(validateUniversalAstEnvelope(brokenProofEnvelope).join('\n'), /missing semantic node missing_node/);

const brokenParadigmEnvelope = createUniversalAstEnvelope({
  id: 'uast_broken_paradigm',
  document,
  semanticIndex,
  paradigmSemantics: createParadigmSemanticsLayer({
    bindings: [{
      id: 'binding_missing_links',
      kind: 'fieldBinding',
      subjectKind: 'semanticNode',
      subjectId: 'missing_node',
      bindingScopeId: 'missing_scope',
      evidenceIds: ['missing_paradigm_evidence']
    }]
  })
});
const brokenParadigmIssues = validateUniversalAstEnvelope(brokenParadigmEnvelope).join('\n');
assert.match(brokenParadigmIssues, /missing semantic node missing_node/);
assert.match(brokenParadigmIssues, /missing paradigm record missing_scope/);
assert.match(brokenParadigmIssues, /missing evidence missing_paradigm_evidence/);
