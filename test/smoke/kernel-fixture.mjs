import {
  capabilityNode,
  createDocument,
  createNativeAstRecord,
  createSemanticIndexRecord,
  createSourceMapRecord,
  entityNode,
  effectNode,
  externNode,
  latticeNode,
  nativeSourceNode,
  typeNode,
  viewNode
} from '../../dist/index.js';

export function createTodoKernelFixture() {
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
  const todoListView = viewNode({
    id: 'view_todo_list',
    name: 'TodoList',
    reads: ['TodoDb.todos'],
    dispatches: ['action_add'],
    props: [{ id: 'view_prop_disabled', name: 'disabled', type: 'Boolean' }],
    events: [{ id: 'view_event_save', name: 'save', action: 'action_add', input: 'TodoInput' }],
    renders: [{
      id: 'render_save_button',
      kind: 'element',
      tagName: 'Button',
      identityKey: 'save',
      text: 'Save',
      props: [{ name: 'disabled', expression: 'disabled' }],
      events: [{ name: 'press', action: 'save' }]
    }]
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
  const document = createDocument({ id: 'mod_todo', name: 'TodoApp', nodes: [tagSet, todoType, saveTodo, httpRequest, fetchTodo, todoListView, todo, nativeTodo] });
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

  return {
    document,
    fetchTodo,
    httpRequest,
    nativeAst,
    nativeTodo,
    saveTodo,
    semanticIndex,
    sourceMap,
    tagSet,
    todo,
    todoListView,
    todoType
  };
}
