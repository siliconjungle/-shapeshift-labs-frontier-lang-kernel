import {
  createSemanticMergeCandidateRecord,
  createSemanticOperationSet,
  createUniversalAstEnvelope,
  createUniversalAstLayer
} from '../../dist/index.js';
import { createProofParadigmFixture } from './proof-paradigm-fixture.mjs';

export function createUniversalAstFixture() {
  const fixture = createProofParadigmFixture();
  const {
    document,
    paradigmEvidence,
    paradigmSemantics,
    proofEvidence,
    proofSpec,
    semanticIndex,
    sourceMap
  } = fixture;
  const projectionMergeEvidence = { id: 'merge_projection', kind: 'proof', status: 'passed', summary: 'Projection merge candidate is symbol anchored.' };
  const runtimeEvidence = { id: 'runtime_probe', kind: 'test', status: 'passed', summary: 'Runtime entrypoint model was checked.' };
  const semanticOperations = createSemanticOperationSet({
    id: 'semantic_operations_todo',
    operations: [
      {
        id: 'op_declare_todo',
        operationKind: 'declaration',
        language: 'typescript',
        semanticNodeId: 'ent_todo',
        semanticSymbolId: 'symbol:Todo',
        nativeAstNodeId: 'native_todo_interface',
        sourceMapId: 'sourcemap_todo_ts',
        sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface',
        evidenceId: 'sourcemap_build',
        readiness: 'ready'
      },
      {
        id: 'op_fetch_todo',
        operationKind: 'effect',
        language: 'typescript',
        semanticNodeId: 'effect_fetch_todo',
        effectId: 'http.request',
        evidenceId: 'runtime_probe',
        readiness: 'needs-review'
      }
    ]
  });
  const projectionMergeCandidate = createSemanticMergeCandidateRecord({
    id: 'merge_projection_todo',
    touchedSymbols: [{
      id: 'symbol:Todo',
      name: 'Todo',
      kind: 'interface',
      semanticNodeId: 'ent_todo',
      nativeAstNodeId: 'native_todo_interface',
      conflictKey: 'symbol:symbol:Todo'
    }],
    touchedSemanticNodes: [{ id: 'ent_todo', kind: 'entity', name: 'Todo', conflictKey: 'node:ent_todo' }],
    nativeSpans: [{
      id: 'span:merge_projection_todo',
      path: 'src/todo.ts',
      language: 'typescript',
      nativeAstNodeId: 'native_todo_interface',
      semanticNodeId: 'ent_todo',
      symbolId: 'symbol:Todo',
      span: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 4, endColumn: 2 },
      conflictKey: 'native:src/todo.ts:1:1:4:2:native_todo_interface'
    }],
    readiness: 'ready',
    evidence: [projectionMergeEvidence]
  });
  const universalAstLayers = {
    losslessSource: createUniversalAstLayer({
      id: 'layer_lossless_source',
      layer: 'losslessSource',
      nativeSourceIds: ['native_source_todo'],
      nativeAstIds: ['native_ts_todo'],
      lossIds: ['loss_decorator'],
      artifacts: [{
        id: 'artifact_source_text',
        kind: 'sourceText',
        nativeSourceId: 'native_source_todo',
        path: 'src/todo.ts',
        hash: 'sha256:example',
        text: 'interface Todo { title: string }'
      }]
    }),
    cst: createUniversalAstLayer({
      id: 'layer_cst',
      layer: 'cst',
      nativeSourceIds: ['native_source_todo'],
      nativeAstIds: ['native_ts_todo'],
      nativeAstNodeIds: ['native_root', 'native_todo_interface'],
      artifacts: [{ id: 'artifact_cst_root', kind: 'cst', nativeAstId: 'native_ts_todo', nativeAstNodeId: 'native_root' }]
    }),
    semanticSymbols: createUniversalAstLayer({
      id: 'layer_semantic_symbols',
      layer: 'semanticSymbols',
      semanticIndexId: 'index_todo',
      semanticNodeIds: ['ent_todo'],
      semanticSymbolIds: ['symbol:Todo'],
      semanticOccurrenceIds: ['occ_todo_def'],
      semanticRelationIds: ['rel_doc_defines_todo'],
      semanticFactIds: ['fact_todo_hash'],
      evidenceIds: ['index_build']
    }),
    effects: createUniversalAstLayer({
      id: 'layer_effects',
      layer: 'effects',
      effectIds: ['http.request'],
      semanticNodeIds: ['effect_fetch_todo', 'cap_http_request'],
      graph: {
        nodes: [
          { id: 'effect_call_fetch', kind: 'effectCall', semanticNodeId: 'effect_fetch_todo' },
          { id: 'capability_http', kind: 'capability', semanticNodeId: 'cap_http_request' }
        ],
        edges: [{ id: 'effect_uses_capability', kind: 'usesCapability', sourceId: 'effect_call_fetch', targetId: 'capability_http' }]
      }
    }),
    controlFlow: createUniversalAstLayer({
      id: 'layer_control_flow',
      layer: 'controlFlow',
      semanticNodeIds: ['ent_todo'],
      graph: {
        nodes: [
          { id: 'cfg_entry', kind: 'entry', semanticNodeId: 'ent_todo' },
          { id: 'cfg_exit', kind: 'exit', semanticNodeId: 'ent_todo' }
        ],
        edges: [{ id: 'cfg_entry_exit', kind: 'next', sourceId: 'cfg_entry', targetId: 'cfg_exit', evidenceIds: ['runtime_probe'] }],
        entryIds: ['cfg_entry'],
        exitIds: ['cfg_exit']
      }
    }),
    dataFlow: createUniversalAstLayer({
      id: 'layer_data_flow',
      layer: 'dataFlow',
      semanticNodeIds: ['ent_todo'],
      graph: {
        nodes: [
          { id: 'df_title_input', kind: 'input', semanticNodeId: 'ent_todo', semanticSymbolId: 'symbol:Todo' },
          { id: 'df_title_field', kind: 'field', semanticNodeId: 'ent_todo', sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface' }
        ],
        edges: [{ id: 'df_title_assignment', kind: 'flowsTo', sourceId: 'df_title_input', targetId: 'df_title_field' }]
      }
    }),
    runtimeModel: createUniversalAstLayer({
      id: 'layer_runtime_model',
      layer: 'runtimeModel',
      semanticNodeIds: ['effect_fetch_todo'],
      effectIds: ['http.request'],
      runtime: {
        id: 'runtime_todo_node',
        target: { language: 'typescript', platform: 'node' },
        semanticNodeIds: ['effect_fetch_todo'],
        effectIds: ['http.request'],
        entrypoints: [{ id: 'entry_fetch_todo', name: 'FetchTodo', semanticNodeId: 'effect_fetch_todo', effectIds: ['http.request'], evidenceIds: ['runtime_probe'] }],
        evidenceIds: ['runtime_probe']
      }
    }),
    projectionEvidence: createUniversalAstLayer({
      id: 'layer_projection_evidence',
      layer: 'projectionEvidence',
      sourceMapIds: ['sourcemap_todo_ts'],
      sourceMapMappingIds: ['sourcemap_todo_ts:map_todo_interface'],
      references: [{ kind: 'semanticSymbol', id: 'symbol:Todo' }],
      evidenceIds: ['sourcemap_build']
    }),
    semanticOperations: createUniversalAstLayer({
      id: 'layer_semantic_operations',
      layer: 'semanticOperations',
      semanticOperationIds: ['op_declare_todo', 'op_fetch_todo'],
      semanticNodeIds: ['ent_todo', 'effect_fetch_todo'],
      semanticSymbolIds: ['symbol:Todo'],
      sourceMapIds: ['sourcemap_todo_ts'],
      sourceMapMappingIds: ['sourcemap_todo_ts:map_todo_interface'],
      effectIds: ['http.request'],
      references: [{ kind: 'semanticOperation', id: 'op_declare_todo' }],
      evidenceIds: ['sourcemap_build', 'runtime_probe']
    }),
    mergeEvidence: createUniversalAstLayer({
      id: 'layer_merge_evidence',
      layer: 'mergeEvidence',
      mergeCandidateIds: ['merge_projection_todo'],
      references: [{ kind: 'sourceMapMapping', id: 'sourcemap_todo_ts:map_todo_interface' }],
      evidenceIds: ['merge_projection']
    })
  };
  const universalAst = createUniversalAstEnvelope({
    id: 'uast_todo',
    document,
    semanticIndex,
    sourceMaps: [sourceMap],
    mergeCandidates: [projectionMergeCandidate],
    semanticOperations,
    proof: proofSpec,
    paradigmSemantics,
    layers: universalAstLayers,
    evidence: [...semanticIndex.evidence, runtimeEvidence, projectionMergeEvidence, proofEvidence, paradigmEvidence]
  });

  return {
    ...fixture,
    projectionMergeCandidate,
    projectionMergeEvidence,
    runtimeEvidence,
    semanticOperations,
    universalAst,
    universalAstLayers
  };
}
