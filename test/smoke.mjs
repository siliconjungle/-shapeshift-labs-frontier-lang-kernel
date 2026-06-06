import assert from 'node:assert/strict';
import {
  applySemanticPatch,
  capabilityNode,
  classifyMerge,
  createDocument,
  createImportResult,
  createNativeAstRecord,
  createNativeAstMergeCandidate,
  createPatch,
  createParadigmSemanticsLayer,
  createSemanticIndexRecord,
  createSemanticMergeCandidateRecord,
  createSemanticMergeCandidateFromImport,
  createSourceMapRecord,
  createSourcePreservationRecord,
  createProofSpecLayer,
  createUniversalAstLayer,
  createUniversalAstEnvelope,
  entityNode,
  effectNode,
  explainSourcePreservation,
  externNode,
  hashDocumentBase,
  hashUniversalAstEnvelope,
  latticeNode,
  nativeSourceNode,
  NativeAstLossKinds,
  ParadigmSemanticsRecordGroups,
  ProofArtifactKinds,
  ProofObligationStatuses,
  ProofSpecContractKinds,
  replayDocument,
  SourceMapPrecisions,
  SourcePreservationLevels,
  stableUniversalAstJson,
  typeNode,
  UniversalAstLayerNames,
  UniversalAstReferenceKinds,
  validateDocument,
  validateParadigmSemanticsLayer,
  validateSemanticIndexRecord,
  validateSourceMapRecord,
  validateProofSpecLayer,
  validateUniversalAstLayer,
  validateUniversalAstEnvelope
} from '../dist/index.js';

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

const tagSet = latticeNode({
  id: 'lat_tag_set',
  name: 'TagSet',
  carrier: 'Set<Text>',
  laws: ['semilattice', 'commutative', 'associative', 'idempotent'],
  frontierCrdt: {
    packageName: '@shapeshift-labs/frontier-crdt',
    exportName: 'createCrdtOrSetLattice',
    lawChecker: 'checkCrdtJoinLaws'
  }
});
const todoType = typeNode({
  id: 'type_todo_input',
  name: 'TodoInput',
  fields: [
    { id: 'todo_input_title', name: 'title', type: 'Text' },
    { id: 'todo_input_tags', name: 'tags', type: { kind: 'set', item: 'Text' } }
  ]
});
const saveTodo = externNode({
  id: 'extern_save_todo',
  name: 'saveTodo',
  language: 'typescript',
  symbol: 'saveTodo',
  signature: { input: 'TodoInput', returns: 'Patch' },
  effects: ['storage']
});
const httpRequest = capabilityNode({
  id: 'cap_http_request',
  name: 'HttpRequest',
  capability: 'http.request',
  category: 'network',
  input: 'Json',
  returns: 'Json',
  adapters: [
    { target: { language: 'typescript', platform: 'node', packageName: 'undici' }, symbol: 'fetch', kind: 'library' },
    { target: { language: 'rust', platform: 'native', packageName: 'reqwest' }, symbol: 'reqwest::Client::execute', kind: 'library' }
  ],
  unsupportedTargets: [
    { target: { language: 'c', platform: 'embedded' }, reason: 'Requires a host socket adapter.' }
  ]
});
const fetchTodo = effectNode({
  id: 'effect_fetch_todo',
  name: 'FetchTodo',
  capability: 'http.request',
  input: 'Json',
  returns: 'Json',
  resources: ['network']
});
const nativeAst = createNativeAstRecord({
  id: 'native_ts_todo',
  language: 'typescript',
  parser: 'typescript',
  sourcePath: 'src/todo.ts',
  sourceHash: 'sha256:example',
  rootId: 'native_root',
  nodes: {
    native_root: {
      id: 'native_root',
      kind: 'SourceFile',
      languageKind: 'ts.SourceFile',
      children: ['native_todo_interface']
    },
    native_todo_interface: {
      id: 'native_todo_interface',
      kind: 'InterfaceDeclaration',
      languageKind: 'ts.InterfaceDeclaration',
      span: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 4, endColumn: 2 }
    }
  },
  losses: [{ id: 'loss_decorator', severity: 'warning', kind: 'unsupportedSyntax', message: 'Decorator retained as native AST metadata.' }]
});
const todo = entityNode({ id: 'ent_todo', name: 'Todo', fields: [
  { id: 'field_title', name: 'title', type: 'Text', merge: { kind: 'conflict' } },
  {
    id: 'field_tags',
    name: 'tags',
    type: 'Set<Text>',
    merge: { kind: 'union', latticeId: 'lat_tag_set' },
    semantic: { kind: 'crdt', latticeId: 'TagSet', crdt: { packageName: '@shapeshift-labs/frontier-crdt', exportName: 'createCrdtOrSetLattice', type: 'or-set' } }
  }
] });
const nativeTodo = nativeSourceNode({
  id: 'native_source_todo',
  name: 'Todo.ts',
  language: 'typescript',
  parser: 'typescript',
  sourcePath: 'src/todo.ts',
  sourceHash: 'sha256:example',
  ast: nativeAst,
  frontierNodeIds: ['ent_todo'],
  losses: nativeAst.losses
});
const document = createDocument({ id: 'mod_todo', name: 'TodoApp', nodes: [tagSet, todoType, saveTodo, httpRequest, fetchTodo, todo, nativeTodo] });
assert.deepEqual(validateDocument(document), []);
assert.equal(document.nodes.cap_http_request.adapters[1].target.language, 'rust');
const semanticIndex = createSemanticIndexRecord({
  id: 'index_todo',
  repository: { rootUri: 'file:///repo', commit: 'abc123' },
  documents: [{ id: 'doc_todo_ts', path: 'src/todo.ts', language: 'typescript', sourceHash: 'sha256:example', nativeSourceId: 'native_source_todo' }],
  symbols: [{ id: 'symbol:Todo', scheme: 'frontier', name: 'Todo', kind: 'interface', language: 'typescript', semanticNodeId: 'ent_todo', nativeAstNodeId: 'native_todo_interface' }],
  occurrences: [{ id: 'occ_todo_def', documentId: 'doc_todo_ts', symbolId: 'symbol:Todo', role: 'definition', span: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 4, endColumn: 2 }, semanticNodeId: 'ent_todo', nativeAstNodeId: 'native_todo_interface' }],
  relations: [{ id: 'rel_doc_defines_todo', sourceId: 'doc_todo_ts', predicate: 'defines', targetId: 'symbol:Todo' }],
  facts: [{ id: 'fact_todo_hash', predicate: 'signatureHash', subjectId: 'symbol:Todo', value: 'fnv1a32:example' }],
  evidence: [{ id: 'index_build', kind: 'import', status: 'passed', summary: 'Built symbol index.' }]
});
assert.deepEqual(validateSemanticIndexRecord(semanticIndex), []);
const sourceMap = createSourceMapRecord({
  id: 'sourcemap_todo_ts',
  sourcePath: 'src/todo.ts',
  sourceHash: 'sha256:example',
  target: { language: 'typescript', platform: 'node', emitPath: 'generated/todo.ts' },
  targetPath: 'generated/todo.ts',
  semanticIndexId: 'index_todo',
  nativeAstId: 'native_ts_todo',
  nativeSourceId: 'native_source_todo',
  mappings: [{
    id: 'map_todo_interface',
    semanticNodeId: 'ent_todo',
    nativeSourceId: 'native_source_todo',
    nativeAstNodeId: 'native_todo_interface',
    semanticSymbolId: 'symbol:Todo',
    semanticOccurrenceId: 'occ_todo_def',
    mergeCandidateId: 'merge_projection_todo',
    sourceSpan: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 4, endColumn: 2 },
    generatedSpan: {
      path: 'generated/todo.ts',
      targetPath: 'generated/todo.ts',
      generatedName: 'Todo',
      startLine: 1,
      startColumn: 1,
      endLine: 4,
      endColumn: 2
    },
    evidenceIds: ['index_build'],
    lossIds: ['loss_decorator'],
    precision: 'declaration'
  }],
  evidence: [{ id: 'sourcemap_build', kind: 'import', status: 'passed', summary: 'Linked native interface to semantic entity.' }],
  metadata: {
    format: 'source-map-v3',
    raw: {
      version: 3,
      file: 'generated/todo.ts',
      sources: ['src/todo.ts'],
      names: ['Todo'],
      ignoreList: [],
      mappings: 'AAAA'
    }
  }
});
assert.deepEqual(validateSourceMapRecord(sourceMap, {
  document,
  nativeSources: [nativeTodo],
  nativeAst,
  semanticIndex,
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence]
}), []);
const exactSourceMap = createSourceMapRecord({
  id: 'sourcemap_exact_todo_ts',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'map_exact_title',
    semanticNodeId: 'ent_todo',
    nativeSourceId: 'native_source_todo',
    nativeAstNodeId: 'native_todo_interface',
    semanticSymbolId: 'symbol:Todo',
    semanticOccurrenceId: 'occ_todo_def',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 3 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 3 },
    precision: 'exact'
  }]
});
const estimatedLoss = {
  id: 'loss_estimated_initializer',
  severity: 'warning',
  kind: 'sourceMapApproximation',
  message: 'Initializer body was preserved with estimated source offsets.',
  sourceMapId: 'sourcemap_estimated_todo_ts',
  sourceMapMappingId: 'map_estimated_initializer',
  evidenceIds: ['estimate_review'],
  preservation: 'estimated'
};
const blockedLoss = {
  id: 'loss_blocked_macro',
  severity: 'error',
  kind: 'macroExpansion',
  message: 'Macro expansion cannot be round-tripped to the native source declaration.',
  sourceMapId: 'sourcemap_blocked_todo_ts',
  sourceMapMappingId: 'map_blocked_macro',
  evidenceIds: ['macro_review'],
  preservation: 'blocked'
};
const estimatedSourceMap = createSourceMapRecord({
  id: 'sourcemap_estimated_todo_ts',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'map_estimated_initializer',
    semanticNodeId: 'ent_todo',
    sourceSpan: { path: 'src/todo.ts', startLine: 6 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 6 },
    precision: 'estimated',
    preservation: 'estimated',
    evidenceIds: ['estimate_review'],
    lossIds: ['loss_estimated_initializer']
  }],
  evidence: [{ id: 'estimate_review', kind: 'review', status: 'passed', summary: 'Reviewed estimated initializer mapping.' }]
});
const blockedSourceMap = createSourceMapRecord({
  id: 'sourcemap_blocked_todo_ts',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'map_blocked_macro',
    semanticNodeId: 'ent_todo',
    sourceSpan: { path: 'src/todo.ts', startLine: 8 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 8 },
    precision: 'unknown',
    preservation: 'blocked',
    evidenceIds: ['macro_review'],
    lossIds: ['loss_blocked_macro']
  }],
  evidence: [{ id: 'macro_review', kind: 'review', status: 'failed', summary: 'Macro expansion blocked source preservation.' }]
});
assert.equal(explainSourcePreservation({
  sourceMap: exactSourceMap,
  mappingId: 'map_exact_title'
}).level, 'exact');
assert.equal(explainSourcePreservation({
  sourceMap,
  mappingId: 'map_todo_interface',
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence]
}).level, 'declaration');
const estimatedPreservation = explainSourcePreservation({
  sourceMap: estimatedSourceMap,
  mappingId: 'map_estimated_initializer',
  losses: [estimatedLoss]
});
assert.equal(estimatedPreservation.level, 'estimated');
assert.deepEqual(estimatedPreservation.lossIds, ['loss_estimated_initializer']);
assert.match(estimatedPreservation.reasons[0], /estimated/);
const blockedPreservation = explainSourcePreservation({
  sourceMap: blockedSourceMap,
  mappingId: 'map_blocked_macro',
  losses: [blockedLoss]
});
assert.equal(blockedPreservation.level, 'blocked');
assert.deepEqual(blockedPreservation.lossIds, ['loss_blocked_macro']);
assert.match(blockedPreservation.reasons[0], /blocked/);
assert.deepEqual(createSourcePreservationRecord({
  id: 'manual_preservation',
  level: 'declaration',
  precision: 'declaration',
  sourceMapId: 'sourcemap_todo_ts',
  sourceMapMappingId: 'map_todo_interface',
  losses: nativeAst.losses,
  evidence: sourceMap.evidence,
  reasons: ['Manual declaration-level review.']
}).evidenceIds, ['sourcemap_build']);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_sourcemap',
  mappings: [
    { id: 'dup', semanticNodeId: 'missing_node', precision: 'exact' },
    { id: 'dup', sourceSpan: { path: 'src/todo.ts', start: 10, end: 1 }, precision: 'line' }
  ]
}), { document }).join('\n'), /duplicate mapping id dup/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_sourcemap_span',
  mappings: [{ id: 'bad_span', sourceSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 2, endLine: 1, endColumn: 1 }, precision: 'line' }]
}), {}).join('\n'), /end line is before start line/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_exact_precision',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'bad_exact',
    sourceSpan: { path: 'src/todo.ts', startLine: 2 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact'
  }]
})).join('\n'), /exact precision requires a source span/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_dangling_links',
  mappings: [{
    id: 'bad_links',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact',
    evidenceIds: ['missing_evidence'],
    lossIds: ['missing_loss']
  }]
}), {
  losses: [{ id: 'known_loss', severity: 'warning', kind: 'sourcePreservation', message: 'Known loss.' }],
  evidence: [{ id: 'known_evidence', kind: 'review', status: 'passed' }]
}).join('\n'), /references missing evidence missing_evidence/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_loss_links',
  mappings: [{
    id: 'ok_mapping',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact'
  }]
}), {
  sourceMaps: [createSourceMapRecord({ id: 'bad_loss_links' })],
  losses: [{
    id: 'loss_bad_source_map',
    severity: 'warning',
    kind: 'sourcePreservation',
    message: 'Dangling source map link.',
    sourceMapId: 'missing_sourcemap',
    sourceMapMappingId: 'missing_mapping',
    evidenceIds: ['missing_loss_evidence']
  }],
  evidence: [{ id: 'known_evidence', kind: 'review', status: 'passed' }]
}).join('\n'), /references missing source map missing_sourcemap/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_loss_mapping_links',
  mappings: [{
    id: 'ok_mapping',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact'
  }]
}), {
  losses: [{
    id: 'loss_bad_mapping',
    severity: 'warning',
    kind: 'sourcePreservation',
    message: 'Dangling source map mapping link.',
    sourceMapId: 'bad_loss_mapping_links',
    sourceMapMappingId: 'missing_mapping',
    evidenceIds: ['missing_loss_evidence']
  }],
  evidence: [{ id: 'known_evidence', kind: 'review', status: 'passed' }]
}).join('\n'), /references missing source map mapping missing_mapping/);
const pointSourceMap = createSourceMapRecord({
  id: 'sourcemap_point',
  mappings: [{
    id: 'map_point',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 5 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 8, startColumn: 1 },
    precision: 'exact',
    metadata: { rawGeneratedLine0: 7, rawGeneratedColumn0: 0, rawSourceLine0: 1, rawSourceColumn0: 4 }
  }],
  metadata: { format: 'source-map-v3', sectionOffset: { line: 7, column: 0 } }
});
assert.deepEqual(validateSourceMapRecord(pointSourceMap), []);
assert.equal(pointSourceMap.mappings[0].metadata.rawGeneratedLine0, 7);
const projectionMergeEvidence = { id: 'merge_projection', kind: 'proof', status: 'passed', summary: 'Projection merge candidate is symbol anchored.' };
const runtimeEvidence = { id: 'runtime_probe', kind: 'test', status: 'passed', summary: 'Runtime entrypoint model was checked.' };
const proofEvidence = { id: 'proof_dafny_check', kind: 'proof', status: 'passed', summary: 'Dafny-style contract obligation was discharged.' };
const proofSpec = createProofSpecLayer({
  id: 'proof_todo',
  contracts: [{
    id: 'contract_todo_title_pre',
    kind: 'precondition',
    subjectKind: 'semanticNode',
    subjectId: 'ent_todo',
    expression: 'title.length > 0',
    language: 'frontier',
    evidenceIds: ['proof_dafny_check']
  }],
  invariants: [{
    id: 'invariant_todo_tags_set',
    kind: 'invariant',
    subjectKind: 'semanticSymbol',
    subjectId: 'symbol:Todo',
    statement: 'tags is a join-semilattice',
    evidenceIds: ['proof_dafny_check']
  }],
  obligations: [{
    id: 'obligation_todo_title',
    kind: 'contract',
    status: 'discharged',
    subjectKind: 'semanticNode',
    subjectId: 'ent_todo',
    contractIds: ['contract_todo_title_pre'],
    artifactIds: ['artifact_solver_todo'],
    statement: 'Todo title precondition holds before save.',
    evidenceIds: ['proof_dafny_check']
  }],
  artifacts: [{
    id: 'artifact_solver_todo',
    kind: 'solverRun',
    status: 'discharged',
    obligationIds: ['obligation_todo_title'],
    evidenceIds: ['proof_dafny_check'],
    summary: 'SMT solver discharged precondition.'
  }],
  assumptions: [{
    id: 'assumption_ts_runtime',
    scope: 'runtime',
    subjectKind: 'effect',
    subjectId: 'http.request',
    description: 'Fetch transport obeys the declared response contract.',
    evidenceIds: ['proof_dafny_check']
  }],
  evidence: [proofEvidence]
});
assert.deepEqual(validateProofSpecLayer(proofSpec, {
  document,
  semanticIndex,
  sourceMaps: [sourceMap],
  evidence: [...semanticIndex.evidence, proofEvidence]
}), []);
const paradigmEvidence = {
  id: 'paradigm_import_review',
  kind: 'import',
  status: 'passed',
  summary: 'Imported mixed-paradigm semantic facets for lexical, logic, stack, array, and lowering records.'
};
const paradigmSemantics = createParadigmSemanticsLayer({
  id: 'paradigm_todo',
  bindingScopes: [{
    id: 'scope_todo_entity',
    kind: 'lexicalScope',
    scopeKind: 'entity',
    semanticNodeId: 'ent_todo',
    nativeSourceId: 'native_source_todo',
    nativeAstId: 'native_ts_todo',
    nativeAstNodeId: 'native_todo_interface',
    evidenceIds: ['paradigm_import_review']
  }],
  bindings: [{
    id: 'binding_todo_title',
    kind: 'fieldBinding',
    name: 'title',
    bindingScopeId: 'scope_todo_entity',
    subjectKind: 'semanticSymbol',
    subjectId: 'symbol:Todo',
    semanticNodeId: 'ent_todo',
    semanticSymbolId: 'symbol:Todo',
    evidenceIds: ['paradigm_import_review']
  }],
  patterns: [{
    id: 'pattern_todo_record',
    kind: 'recordPattern',
    bindingId: 'binding_todo_title',
    shape: { fields: ['title', 'tags'] },
    evidenceIds: ['paradigm_import_review']
  }],
  typeConstraints: [{
    id: 'type_title_text',
    kind: 'structuralConstraint',
    bindingId: 'binding_todo_title',
    expression: 'title: Text',
    evidenceIds: ['paradigm_import_review']
  }],
  evaluationModels: [{
    id: 'eval_save_eager',
    kind: 'eagerEvaluation',
    semanticNodeId: 'extern_save_todo',
    strategy: 'callByValue',
    evidenceIds: ['paradigm_import_review']
  }],
  memoryLocations: [{
    id: 'memory_todo_heap',
    kind: 'heapObject',
    evaluationModelId: 'eval_save_eager',
    storage: 'managed',
    evidenceIds: ['paradigm_import_review']
  }],
  effectRegions: [{
    id: 'effect_http_region',
    kind: 'asyncEffectRegion',
    semanticNodeId: 'effect_fetch_todo',
    effectIds: ['http.request'],
    evidenceIds: ['paradigm_import_review']
  }],
  controlRegions: [{
    id: 'control_save_linear',
    kind: 'sequentialControl',
    semanticNodeId: 'extern_save_todo',
    evaluationModelId: 'eval_save_eager',
    evidenceIds: ['paradigm_import_review']
  }],
  logicPrograms: [{
    id: 'logic_todo_valid',
    kind: 'hornClause',
    predicate: 'valid_todo(Title) :- non_empty(Title)',
    subjectKind: 'semanticNode',
    subjectId: 'ent_todo',
    evidenceIds: ['paradigm_import_review']
  }],
  actorSystems: [{
    id: 'actor_todo_worker',
    kind: 'mailboxActor',
    mailbox: 'todo.updates',
    effectRegionId: 'effect_http_region',
    evidenceIds: ['paradigm_import_review']
  }],
  stackEffects: [{
    id: 'stack_validate_title',
    kind: 'concatenativeStackEffect',
    inputs: ['title'],
    outputs: ['valid?'],
    relatedRecordIds: ['logic_todo_valid'],
    evidenceIds: ['paradigm_import_review']
  }],
  arrayShapes: [{
    id: 'array_tags_rank1',
    kind: 'rankedArray',
    semanticNodeId: 'ent_todo',
    rank: 1,
    elementType: 'Text',
    evidenceIds: ['paradigm_import_review']
  }],
  numericKernels: [{
    id: 'kernel_tag_count',
    kind: 'elementalKernel',
    arrayShapeId: 'array_tags_rank1',
    operation: 'count(tags)',
    evidenceIds: ['paradigm_import_review']
  }],
  dataflowNetworks: [{
    id: 'dataflow_todo_pipeline',
    kind: 'demandDataflow',
    relatedRecordIds: ['kernel_tag_count', 'effect_http_region'],
    evidenceIds: ['paradigm_import_review']
  }],
  clockModels: [{
    id: 'clock_runtime_tick',
    kind: 'eventLoopClock',
    effectRegionId: 'effect_http_region',
    evidenceIds: ['paradigm_import_review']
  }],
  objectModels: [{
    id: 'object_todo_structural',
    kind: 'structuralObject',
    semanticNodeId: 'ent_todo',
    memoryLocationId: 'memory_todo_heap',
    evidenceIds: ['paradigm_import_review']
  }],
  macroExpansions: [{
    id: 'macro_todo_generated',
    kind: 'decoratorExpansion',
    sourceMapId: 'sourcemap_todo_ts',
    sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface',
    lossIds: ['loss_decorator'],
    evidenceIds: ['paradigm_import_review']
  }],
  reflectionBoundaries: [{
    id: 'reflection_fetch_adapter',
    kind: 'foreignRuntimeBoundary',
    effectIds: ['http.request'],
    relatedRecordIds: ['effect_http_region'],
    evidenceIds: ['paradigm_import_review']
  }],
  loweringRecords: [{
    id: 'lower_ts_to_frontier_todo',
    kind: 'nativeToFrontier',
    sourceRecordId: 'macro_todo_generated',
    targetRecordId: 'object_todo_structural',
    sourceMapId: 'sourcemap_todo_ts',
    sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface',
    lossIds: ['loss_decorator'],
    evidenceIds: ['paradigm_import_review']
  }],
  evidence: [paradigmEvidence]
});
assert.deepEqual(validateParadigmSemanticsLayer(paradigmSemantics, {
  document,
  nativeSources: [nativeTodo],
  nativeAst,
  semanticIndex,
  sourceMaps: [sourceMap],
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence, paradigmEvidence]
}), []);
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
  proof: proofSpec,
  paradigmSemantics,
  layers: universalAstLayers,
  evidence: [...semanticIndex.evidence, runtimeEvidence, projectionMergeEvidence, proofEvidence, paradigmEvidence]
});
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
const baseHash = hashDocumentBase(document);
const nativeImportPatch = createPatch({
  id: 'native-import-todo',
  baseHash,
  operations: [{
    op: 'updateNode',
    id: 'ent_todo',
    set: { metadata: { importedFrom: 'src/todo.ts' } },
    touches: [{ id: 'field_title', access: 'write' }]
  }],
  evidence: [{ id: 'native_import_typecheck', kind: 'typecheck', status: 'passed' }]
});
const importResult = createImportResult({
  id: 'import_todo_ts',
  language: 'typescript',
  sourcePath: 'src/todo.ts',
  document,
  patch: nativeImportPatch,
  nativeAst,
  semanticIndex,
  universalAst,
  losses: nativeAst.losses,
  evidence: [{ id: 'import_parse', kind: 'import', status: 'passed', summary: 'Parsed TypeScript native AST with one loss record.' }]
});
assert.equal(importResult.nativeAst.nodes.native_todo_interface.kind, 'InterfaceDeclaration');
assert.equal(importResult.semanticIndex.symbols[0].id, 'symbol:Todo');
assert.equal(importResult.universalAst.semanticIndex.id, 'index_todo');
assert.equal(importResult.sourceMaps[0].id, 'sourcemap_todo_ts');
assert.match(importResult.losses[0].message, /Decorator/);
assert.equal(importResult.mergeCandidates.length, 1);
const mergeCandidate = importResult.mergeCandidates[0];
assert.equal(mergeCandidate.kind, 'frontier.lang.semanticMergeCandidate');
assert.equal(mergeCandidate.patchId, 'native-import-todo');
assert.equal(mergeCandidate.readiness, 'ready-with-losses');
assert.deepEqual(mergeCandidate.touchedSymbols.map((symbol) => symbol.id), ['symbol:Todo']);
assert.deepEqual(mergeCandidate.touchedSemanticNodes.map((node) => node.id), ['ent_todo']);
assert.equal(mergeCandidate.nativeSpans.some((span) => span.nativeAstNodeId === 'native_todo_interface' && span.path === 'src/todo.ts'), true);
assert.equal(mergeCandidate.conflictKeys.includes('node:ent_todo'), true);
assert.equal(mergeCandidate.conflictKeys.includes('region:field_title'), true);
assert.equal(mergeCandidate.conflictKeys.includes('symbol:symbol:Todo'), true);
assert.equal(mergeCandidate.conflictKeys.some((key) => key.startsWith('native:src/todo.ts:1:1:4:2:native_todo_interface')), true);
assert.equal(createSemanticMergeCandidateFromImport({ importResult, id: 'merge-candidate:explicit' }).touchedSymbols[0].id, 'symbol:Todo');
const nativeAstMergeCandidate = createNativeAstMergeCandidate({
  id: 'merge-candidate:native-ast',
  document,
  nativeAst,
  semanticIndex,
  sourceMaps: [sourceMap],
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence]
});
assert.equal(nativeAstMergeCandidate.kind, 'frontier.lang.semanticMergeCandidate');
assert.equal(nativeAstMergeCandidate.readiness, 'ready-with-losses');
assert.equal(nativeAstMergeCandidate.touchedSymbols[0].id, 'symbol:Todo');
assert.equal(nativeAstMergeCandidate.touchedSemanticNodes[0].id, 'ent_todo');
assert.equal(nativeAstMergeCandidate.nativeSpans.some((span) => span.id === 'sourcemap:sourcemap_todo_ts:map_todo_interface'), true);
assert.equal(nativeAstMergeCandidate.conflictKeys.includes('node:ent_todo'), true);
assert.equal(nativeAstMergeCandidate.conflictKeys.includes('symbol:symbol:Todo'), true);
assert.equal(nativeAstMergeCandidate.conflictKeys.includes('sig:typescript:symbol:Todo:fnv1a32:example'), true);
assert.equal(nativeAstMergeCandidate.conflictKeys.some((key) => key.startsWith('ast-subtree:src/todo.ts:fnv1a32:')), true);
assert.equal(nativeAstMergeCandidate.metadata.nativeAstId, 'native_ts_todo');
assert.equal(nativeAstMergeCandidate.metadata.sourceMapIds[0], 'sourcemap_todo_ts');
assert.match(
  validateDocument(createDocument({ id: 'bad', name: 'Bad', nodes: [
    entityNode({ id: 'bad_entity', name: 'Bad', fields: [
      { id: 'bad_field', name: 'value', type: 'Text', merge: { kind: 'union', latticeId: 'missing_lattice' } }
    ] })
  ] })).join('\n'),
  /missing lattice/
);
const rename = createPatch({ id: 'rename', baseHash, operations: [{ op: 'renameNode', id: 'ent_todo', name: 'Task' }] });
assert.equal(applySemanticPatch(document, rename).nodes.ent_todo.name, 'Task');
assert.equal(replayDocument(document, [{ id: 'event_rename', actor: 'test', patch: rename }]).history.at(-1).id, 'event_rename');
const left = createPatch({ id: 'left', baseHash, operations: [{ op: 'addEvidence', evidence: { id: 'left', kind: 'test', status: 'passed' }, touches: [{ id: 'field_tags', access: 'write' }] }] });
const right = createPatch({ id: 'right', baseHash, operations: [{ op: 'addEvidence', evidence: { id: 'right', kind: 'test', status: 'passed' }, touches: [{ id: 'field_tags', access: 'write' }] }] });
assert.equal(classifyMerge(document, left, right).status, 'safe-by-merge-law');
assert.equal(classifyMerge(document, createPatch({ id: 'stale', baseHash: 'fnv1a32:00000000', operations: [] }), right).status, 'unknown-needs-review');
assert.equal(classifyMerge(document, createPatch({ id: 'bad-target', baseHash, targetHash: 'fnv1a32:00000000', operations: [] }), right).status, 'unknown-needs-review');
const failedEvidence = createPatch({ id: 'failed-evidence', baseHash, operations: [{ op: 'addEvidence', evidence: { id: 'failing-check', kind: 'test', status: 'failed' }, touches: [{ id: 'field_tags', access: 'write' }] }] });
assert.equal(classifyMerge(document, failedEvidence, right).autoMergeable, false);
