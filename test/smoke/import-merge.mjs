import assert from 'node:assert/strict';
import {
  applySemanticPatch,
  classifyMerge,
  createDocument,
  createImportResult,
  createNativeAstMergeCandidate,
  createPatch,
  createSemanticMergeCandidateFromImport,
  entityNode,
  hashDocumentBase,
  replayDocument,
  validateDocument
} from '../../dist/index.js';
import { createUniversalAstFixture } from './universal-fixture.mjs';

const { document, nativeAst, semanticIndex, sourceMap, universalAst } = createUniversalAstFixture();
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
  evidence: [{ id: 'import_parse', kind: 'import', status: 'passed', summary: 'Parsed TypeScript native AST with one loss record.' }],
  metadata: {
    semanticMergeContract: {
      id: 'contract_import_todo',
      kind: 'import',
      language: 'typescript',
      safe: true,
      requiredEvidenceIds: ['native_import_typecheck']
    }
  }
});

assert.equal(importResult.nativeAst.nodes.native_todo_interface.kind, 'InterfaceDeclaration');
assert.equal(importResult.semanticIndex.symbols[0].id, 'symbol:Todo');
assert.equal(importResult.universalAst.semanticIndex.id, 'index_todo');
assert.equal(importResult.sourceMaps[0].id, 'sourcemap_todo_ts');
assert.match(importResult.losses[0].message, /Decorator/);
assert.equal(document.nodes.view_todo_list.props[0].type, 'Boolean');
assert.equal(document.nodes.view_todo_list.events[0].action, 'action_add');
assert.equal(document.nodes.view_todo_list.renders[0].tagName, 'Button');
assert.equal(document.nodes.view_todo_list.renders[0].events[0].action, 'save');
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
assert.equal(mergeCandidate.metadata.semanticMergeContract.id, 'contract_import_todo');
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
