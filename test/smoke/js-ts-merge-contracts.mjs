import assert from 'node:assert/strict';
import {
  createJsTsConflictSidecarRecord,
  createJsTsMemberRecord,
  createJsTsMergeContractRecord,
  createJsTsMergeImportRecord,
  createJsTsTopLevelDeclarationRecord,
  createJsTsTriviaRecord,
  jsTsMergeContractConflictKeys
} from '../../dist/index.js';

const importRecord = createJsTsMergeImportRecord({
  importKind: 'type',
  moduleSpecifier: './model.js',
  specifiers: [{ kind: 'named', importedName: 'Todo', localName: 'Todo' }],
  sourceSpan: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 1, endColumn: 37 },
  semanticSymbolId: 'symbol:Todo'
});

assert.equal(importRecord.kind, 'frontier.lang.jsTsMergeImport');
assert.equal(importRecord.version, 1);
assert.equal(importRecord.sourceSpans.length, 1);
assert.equal(importRecord.semanticSymbolIds[0], 'symbol:Todo');
assert.equal(importRecord.conflictKeys[0], 'js-ts:import:./model.js:type:Todo');

const topLevelDeclaration = createJsTsTopLevelDeclarationRecord({
  declarationKind: 'interface',
  name: 'Todo',
  exported: true,
  sourceSpan: { path: 'src/todo.ts', startLine: 3, startColumn: 1, endLine: 6, endColumn: 2 },
  nameSpan: { path: 'src/todo.ts', startLine: 3, startColumn: 18, endLine: 3, endColumn: 22 },
  bodySpan: { path: 'src/todo.ts', startLine: 3, startColumn: 23, endLine: 6, endColumn: 2 },
  semanticNodeId: 'ent_todo',
  nativeAstNodeId: 'native_todo_interface',
  memberIds: ['member_title'],
  triviaIds: ['trivia_todo_doc']
});

assert.equal(topLevelDeclaration.kind, 'frontier.lang.jsTsMergeTopLevelDeclaration');
assert.equal(topLevelDeclaration.exported, true);
assert.equal(topLevelDeclaration.memberIds[0], 'member_title');
assert.equal(topLevelDeclaration.conflictKeys[0], 'js-ts:declaration:interface:Todo');

const memberRecord = createJsTsMemberRecord({
  id: 'member_title',
  ownerDeclarationId: topLevelDeclaration.id,
  memberKind: 'property',
  name: 'title',
  sourceSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 3, endLine: 4, endColumn: 17 },
  keySpan: { path: 'src/todo.ts', startLine: 4, startColumn: 3, endLine: 4, endColumn: 8 },
  valueSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 10, endLine: 4, endColumn: 16 },
  semanticNodeId: 'field_title'
});

assert.equal(memberRecord.kind, 'frontier.lang.jsTsMergeMember');
assert.equal(memberRecord.ownerDeclarationId, topLevelDeclaration.id);
assert.equal(memberRecord.semanticNodeIds[0], 'field_title');
assert.equal(memberRecord.conflictKeys[0], 'js-ts:member:js-ts-declaration%3ATodo:property:title');

const triviaRecord = createJsTsTriviaRecord({
  id: 'trivia_todo_doc',
  triviaKind: 'blockComment',
  placement: 'leading',
  attachedToId: topLevelDeclaration.id,
  sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1, endLine: 2, endColumn: 18 },
  textHash: 'fnv1a32:comment'
});

assert.equal(triviaRecord.kind, 'frontier.lang.jsTsMergeTrivia');
assert.equal(triviaRecord.sourceSpans[0].path, 'src/todo.ts');
assert.equal(
  triviaRecord.conflictKeys[0],
  'js-ts:trivia:js-ts-declaration%3ATodo:leading:blockComment:src/todo.ts%3A2%3A1%3A2%3A18'
);

const conflictSidecar = createJsTsConflictSidecarRecord({
  conflictKind: 'signature',
  targetKind: 'member',
  targetId: memberRecord.id,
  sides: [
    {
      side: 'left',
      recordId: memberRecord.id,
      sourceSpan: memberRecord.sourceSpan,
      contentHash: 'fnv1a32:left-title',
      payload: { type: 'string' }
    },
    {
      side: 'right',
      recordId: memberRecord.id,
      sourceSpan: memberRecord.sourceSpan,
      contentHash: 'fnv1a32:right-title',
      payload: { type: 'Text' }
    }
  ],
  evidenceId: 'contract_conflict_scan'
});

assert.equal(conflictSidecar.kind, 'frontier.lang.jsTsMergeConflictSidecar');
assert.equal(conflictSidecar.sides.length, 2);
assert.equal(conflictSidecar.evidenceIds[0], 'contract_conflict_scan');
assert.equal(conflictSidecar.conflictKeys[0], 'js-ts:conflict:signature:member:member_title');

const contract = createJsTsMergeContractRecord({
  id: 'contract_src_todo_ts',
  language: 'typescript',
  sourcePath: 'src/todo.ts',
  sourceHash: 'fnv1a32:source',
  imports: [importRecord],
  topLevelDeclarations: [topLevelDeclaration],
  members: [memberRecord],
  trivia: [triviaRecord],
  conflictSidecars: [conflictSidecar],
  evidenceIds: ['contract_parse_smoke']
});

assert.equal(contract.kind, 'frontier.lang.jsTsMergeContract');
assert.equal(contract.imports[0].moduleSpecifier, './model.js');
assert.equal(contract.topLevelDeclarations[0].bodySpan.endLine, 6);
assert.equal(contract.members[0].keySpan.startColumn, 3);
assert.equal(contract.trivia[0].textHash, 'fnv1a32:comment');
assert.equal(contract.conflictSidecars[0].sides[1].payload.type, 'Text');
assert.equal(contract.conflictKeys.includes('js-ts:import:./model.js:type:Todo'), true);
assert.equal(jsTsMergeContractConflictKeys(contract).includes('js-ts:conflict:signature:member:member_title'), true);
