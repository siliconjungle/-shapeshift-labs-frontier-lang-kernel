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
  createSemanticIndexRecord,
  createSemanticMergeCandidateFromImport,
  createSourceMapRecord,
  createUniversalAstEnvelope,
  entityNode,
  effectNode,
  externNode,
  hashDocumentBase,
  hashUniversalAstEnvelope,
  latticeNode,
  nativeSourceNode,
  NativeAstLossKinds,
  replayDocument,
  SourceMapPrecisions,
  stableUniversalAstJson,
  typeNode,
  validateDocument,
  validateSemanticIndexRecord,
  validateSourceMapRecord,
  validateUniversalAstEnvelope
} from '../dist/index.js';

assert.equal(NativeAstLossKinds.includes('sourceMapApproximation'), true);
assert.equal(SourceMapPrecisions.includes('declaration'), true);

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
const universalAst = createUniversalAstEnvelope({
  id: 'uast_todo',
  document,
  semanticIndex,
  sourceMaps: [sourceMap],
  evidence: semanticIndex.evidence
});
assert.deepEqual(validateUniversalAstEnvelope(universalAst), []);
assert.equal(universalAst.nativeSources[0].id, 'native_source_todo');
assert.equal(universalAst.losses[0].kind, 'unsupportedSyntax');
assert.equal(universalAst.sourceMaps[0].mappings[0].semanticNodeId, 'ent_todo');
assert.match(stableUniversalAstJson(universalAst), /frontier\.lang\.universalAst/);
assert.match(hashUniversalAstEnvelope(universalAst), /^fnv1a32:/);
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
