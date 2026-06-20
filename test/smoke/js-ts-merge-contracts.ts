import {
  createJsTsConflictSidecarRecord,
  createJsTsMemberRecord,
  createJsTsMergeContractRecord,
  createJsTsMergeImportRecord,
  createJsTsTopLevelDeclarationRecord,
  createJsTsTriviaRecord,
  jsTsMergeContractConflictKeys,
  type JsTsConflictSideRecord,
  type JsTsConflictSidecarRecord,
  type JsTsMemberRecord,
  type JsTsMergeContractRecord,
  type JsTsMergeImportRecord,
  type JsTsTopLevelDeclarationRecord,
  type JsTsTriviaRecord
} from '../../dist/index.js';

const importRecord: JsTsMergeImportRecord = createJsTsMergeImportRecord({
  importKind: 'type',
  moduleSpecifier: './model.js',
  specifiers: [{ kind: 'named', importedName: 'Todo', localName: 'Todo' }],
  sourceSpan: { path: 'src/todo.ts', startLine: 1, startColumn: 1, endLine: 1, endColumn: 37 },
  semanticSymbolId: 'symbol:Todo'
});

const declarationRecord: JsTsTopLevelDeclarationRecord = createJsTsTopLevelDeclarationRecord({
  declarationKind: 'interface',
  name: 'Todo',
  exported: true,
  sourceSpan: { path: 'src/todo.ts', startLine: 3, startColumn: 1, endLine: 6, endColumn: 2 },
  semanticNodeId: 'ent_todo',
  nativeAstNodeId: 'native_todo_interface'
});

const memberRecord: JsTsMemberRecord = createJsTsMemberRecord({
  id: 'member_title',
  ownerDeclarationId: declarationRecord.id,
  memberKind: 'property',
  name: 'title',
  sourceSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 3, endLine: 4, endColumn: 17 },
  semanticNodeId: 'field_title'
});

const triviaRecord: JsTsTriviaRecord = createJsTsTriviaRecord({
  triviaKind: 'blockComment',
  placement: 'leading',
  attachedToId: declarationRecord.id,
  sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1, endLine: 2, endColumn: 18 },
  textHash: 'fnv1a32:comment'
});

const leftSide: JsTsConflictSideRecord = {
  side: 'left',
  recordId: memberRecord.id,
  sourceSpan: memberRecord.sourceSpan,
  payload: { type: 'string' }
};

const conflictSidecar: JsTsConflictSidecarRecord = createJsTsConflictSidecarRecord({
  conflictKind: 'signature',
  targetKind: 'member',
  targetId: memberRecord.id,
  sides: [
    leftSide,
    {
      side: 'right',
      recordId: memberRecord.id,
      sourceSpan: memberRecord.sourceSpan,
      payload: { type: 'Text' }
    }
  ],
  evidenceId: 'contract_conflict_scan'
});

const contract: JsTsMergeContractRecord = createJsTsMergeContractRecord({
  id: 'contract_src_todo_ts',
  language: 'typescript',
  sourcePath: 'src/todo.ts',
  sourceHash: 'fnv1a32:source',
  imports: [importRecord],
  topLevelDeclarations: [declarationRecord],
  members: [memberRecord],
  trivia: [triviaRecord],
  conflictSidecars: [conflictSidecar]
});

const visibleImport: JsTsMergeImportRecord = contract.imports[0];
const visibleDeclaration: JsTsTopLevelDeclarationRecord = contract.topLevelDeclarations[0];
const visibleMember: JsTsMemberRecord = contract.members[0];
const visibleTrivia: JsTsTriviaRecord = contract.trivia[0];
const visibleConflict: JsTsConflictSidecarRecord = contract.conflictSidecars[0];
const visibleKeys: readonly string[] = jsTsMergeContractConflictKeys(contract);

visibleImport.moduleSpecifier?.toUpperCase();
visibleDeclaration.name?.toUpperCase();
visibleMember.name?.toUpperCase();
visibleTrivia.textHash?.toUpperCase();
visibleConflict.sides[0].side.toUpperCase();
visibleKeys.includes('js-ts:conflict:signature:member:member_title');
