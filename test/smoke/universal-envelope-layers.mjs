import assert from 'node:assert/strict';
import {
  UniversalAstLayerNames,
  capabilityNode,
  createDocument,
  createUniversalAstEnvelope,
  createUniversalAstLayer,
  effectNode,
  uniqueEvidence,
  validateUniversalAstEnvelope
} from '../../dist/index.js';
import { createUniversalAstFixture } from './universal-fixture.mjs';

const { document, universalAst } = createUniversalAstFixture();

for (const layerName of [
  'losslessSource',
  'cst',
  'semanticSymbols',
  'effects',
  'controlFlow',
  'dataFlow',
  'semanticOperations',
  'runtimeModel',
  'projectionEvidence',
  'mergeEvidence'
]) {
  assert.equal(UniversalAstLayerNames.includes(layerName), true);
  assert.equal(Boolean(universalAst.layers[layerName]), true);
}

assert.deepEqual(
  uniqueEvidence([
    { id: 'runtime_probe', kind: 'test', status: 'passed' },
    { id: 'runtime_probe', kind: 'test', status: 'passed' }
  ]).map((record) => record.id),
  ['runtime_probe']
);

const runtimeOnlyDocument = createDocument({
  id: 'mod_runtime_only',
  name: 'RuntimeOnly',
  nodes: [
    capabilityNode({ id: 'cap_runtime_http', name: 'RuntimeHttp', capability: 'http.request', category: 'network' }),
    effectNode({ id: 'effect_runtime_http', name: 'RuntimeHttpEffect', capability: 'http.request' })
  ]
});
const runtimeOnlyEnvelope = createUniversalAstEnvelope({
  id: 'uast_runtime_only',
  document: runtimeOnlyDocument,
  layers: {
    runtimeModel: createUniversalAstLayer({
      id: 'layer_runtime_only',
      layer: 'runtimeModel',
      effectIds: ['http.request'],
      runtime: {
        id: 'runtime_only_model',
        effectIds: ['http.request'],
        entrypoints: [{ id: 'entry_fetch', effectIds: ['http.request'] }]
      }
    })
  }
});
assert.deepEqual(validateUniversalAstEnvelope(runtimeOnlyEnvelope), []);
assert.equal(runtimeOnlyEnvelope.layers.losslessSource, undefined);
assert.equal(runtimeOnlyEnvelope.layers.semanticSymbols, undefined);

const brokenCrossLayerEnvelope = createUniversalAstEnvelope({
  id: 'uast_broken_cross_layer',
  document,
  layers: {
    runtimeModel: createUniversalAstLayer({
      id: 'layer_runtime_missing_projection',
      layer: 'runtimeModel',
      references: [{ kind: 'layer', id: 'projectionEvidence' }],
      runtime: {
        id: 'runtime_missing_evidence',
        effectIds: ['http.request'],
        entrypoints: [{ id: 'entry_missing_evidence', effectIds: ['http.request'], evidenceIds: ['missing_runtime_probe'] }]
      }
    })
  }
});
const brokenCrossLayerIssues = validateUniversalAstEnvelope(brokenCrossLayerEnvelope).join('\n');
assert.match(brokenCrossLayerIssues, /missing layer projectionEvidence/);
assert.match(brokenCrossLayerIssues, /missing evidence missing_runtime_probe/);
