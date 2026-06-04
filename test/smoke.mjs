import assert from 'node:assert/strict';
import {
  applySemanticPatch,
  classifyMerge,
  createDocument,
  createPatch,
  entityNode,
  hashDocumentBase,
  replayDocument,
  validateDocument
} from '../dist/index.js';

const todo = entityNode({ id: 'ent_todo', name: 'Todo', fields: [
  { id: 'field_title', name: 'title', type: 'Text', merge: { kind: 'conflict' } },
  { id: 'field_tags', name: 'tags', type: 'Set<Text>', merge: { kind: 'union', law: 'semilattice' } }
] });
const document = createDocument({ id: 'mod_todo', name: 'TodoApp', nodes: [todo] });
assert.deepEqual(validateDocument(document), []);
const baseHash = hashDocumentBase(document);
const rename = createPatch({ id: 'rename', baseHash, operations: [{ op: 'renameNode', id: 'ent_todo', name: 'Task' }] });
assert.equal(applySemanticPatch(document, rename).nodes.ent_todo.name, 'Task');
assert.equal(replayDocument(document, [{ id: 'event_rename', actor: 'test', patch: rename }]).history.at(-1).id, 'event_rename');
const left = createPatch({ id: 'left', baseHash, operations: [{ op: 'addEvidence', evidence: { id: 'left', kind: 'test', status: 'passed' }, touches: [{ id: 'field_tags', access: 'write' }] }] });
const right = createPatch({ id: 'right', baseHash, operations: [{ op: 'addEvidence', evidence: { id: 'right', kind: 'test', status: 'passed' }, touches: [{ id: 'field_tags', access: 'write' }] }] });
assert.equal(classifyMerge(document, left, right).status, 'safe-by-merge-law');
assert.equal(classifyMerge(document, createPatch({ id: 'stale', baseHash: 'fnv1a32:00000000', operations: [] }), right).status, 'unknown-needs-review');
