import assert from 'node:assert/strict';
import {
  applySemanticPatch,
  classifyMerge,
  createDocument,
  createPatch,
  entityNode,
  externNode,
  hashDocumentBase,
  latticeNode,
  replayDocument,
  typeNode,
  validateDocument
} from '../dist/index.js';

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
const document = createDocument({ id: 'mod_todo', name: 'TodoApp', nodes: [tagSet, todoType, saveTodo, todo] });
assert.deepEqual(validateDocument(document), []);
assert.match(
  validateDocument(createDocument({ id: 'bad', name: 'Bad', nodes: [
    entityNode({ id: 'bad_entity', name: 'Bad', fields: [
      { id: 'bad_field', name: 'value', type: 'Text', merge: { kind: 'union', latticeId: 'missing_lattice' } }
    ] })
  ] })).join('\n'),
  /missing lattice/
);
const baseHash = hashDocumentBase(document);
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
