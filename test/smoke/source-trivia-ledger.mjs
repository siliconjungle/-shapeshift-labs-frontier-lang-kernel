import assert from 'node:assert/strict';
import {
  createSourceTriviaLedger,
  validateSourceTriviaLedgerRecord
} from '../../dist/index.js';

const sourceText = [
  '// leading import',
  "import type { Foo } from './foo.js';",
  '',
  '/* profile block */',
  'export interface Profile {',
  '  /** stable id */',
  '  id: string;',
  '  email?: string;',
  '}',
  '',
  'type Settings = {',
  '  theme: string;',
  '};',
  '',
  'const defaults = {',
  '  enabled: true,',
  "  label: 'demo'",
  '};',
  ''
].join('\n');

const ledger = createSourceTriviaLedger({
  id: 'source-trivia-ledger:smoke',
  sourcePath: 'test/fixtures/js-ts-semantic-merge/source-trivia-ledger.ts',
  language: 'typescript',
  sourceText
});

assert.deepEqual(validateSourceTriviaLedgerRecord(ledger), []);
assert.equal(ledger.sourceLength, sourceText.length);
assert.deepEqual(
  pickOffsets(ledger.sourceSpan),
  { start: 0, end: sourceText.length },
  'source span should cover exact source byte range'
);
assert.deepEqual(
  pickOffsets(ledger.sourceBoundary.span),
  { start: 0, end: sourceText.length },
  'source boundary should cover exact source byte range'
);

const importRecord = assertSlice(
  ledger.imports,
  "import type { Foo } from './foo.js';",
  'static type import'
);
assert.equal(importRecord.importKind, 'type');
assert.equal(importRecord.moduleSpecifier, './foo.js');

assertSlice(ledger.spans, '// leading import', 'line comment');
assertSlice(ledger.spans, '/* profile block */', 'block comment');
assertSlice(ledger.spans, '/** stable id */', 'member block comment');
assert.ok(
  ledger.triviaSpans.some((span) => span.kind === 'whitespace' && span.lineBreaks >= 2 && slice(span) === '\n\n'),
  'ledger should record exact blank-line whitespace'
);

assertSlice(
  ledger.declarations.filter((record) => record.keyword === 'interface' && record.name === 'Profile'),
  [
    'export interface Profile {',
    '  /** stable id */',
    '  id: string;',
    '  email?: string;',
    '}'
  ].join('\n'),
  'exported interface declaration'
);
assertSlice(
  ledger.declarations.filter((record) => record.keyword === 'type' && record.name === 'Settings'),
  [
    'type Settings = {',
    '  theme: string;',
    '};'
  ].join('\n'),
  'type alias declaration'
);
assertSlice(
  ledger.declarations.filter((record) => record.keyword === 'const' && record.name === 'defaults'),
  [
    'const defaults = {',
    '  enabled: true,',
    "  label: 'demo'",
    '};'
  ].join('\n'),
  'object declaration'
);

assertSlice(
  ledger.members.filter((record) => record.memberKind === 'interface' && record.name === 'id'),
  'id: string;',
  'interface member'
);
assertSlice(
  ledger.members.filter((record) => record.memberKind === 'interface' && record.name === 'email'),
  'email?: string;',
  'optional interface member'
);
assertSlice(
  ledger.members.filter((record) => record.memberKind === 'type' && record.name === 'theme'),
  'theme: string;',
  'type-literal member'
);
assertSlice(
  ledger.members.filter((record) => record.memberKind === 'object' && record.name === 'enabled'),
  'enabled: true,',
  'object member with comma'
);
assertSlice(
  ledger.members.filter((record) => record.memberKind === 'object' && record.name === 'label'),
  "label: 'demo'",
  'object member without trailing comma'
);

const gapLedger = cloneLedger(ledger);
gapLedger.spans[1] = {
  ...gapLedger.spans[1],
  span: { ...gapLedger.spans[1].span, start: gapLedger.spans[1].span.start + 1 }
};
assert.match(validateSourceTriviaLedgerRecord(gapLedger).join('\n'), /gap/);

const overlapLedger = cloneLedger(ledger);
overlapLedger.spans[1] = {
  ...overlapLedger.spans[1],
  span: { ...overlapLedger.spans[1].span, start: overlapLedger.spans[1].span.start - 1 }
};
assert.match(validateSourceTriviaLedgerRecord(overlapLedger).join('\n'), /overlap/);

const duplicateRecordKeyLedger = cloneLedger(ledger);
duplicateRecordKeyLedger.members[1] = {
  ...duplicateRecordKeyLedger.members[1],
  conflictKey: duplicateRecordKeyLedger.members[0].conflictKey
};
assert.match(validateSourceTriviaLedgerRecord(duplicateRecordKeyLedger).join('\n'), /duplicate record conflict key/);

const duplicateLedgerKeyLedger = cloneLedger(ledger);
duplicateLedgerKeyLedger.conflictKeys = [
  duplicateLedgerKeyLedger.conflictKeys[0],
  duplicateLedgerKeyLedger.conflictKeys[0]
];
assert.match(validateSourceTriviaLedgerRecord(duplicateLedgerKeyLedger).join('\n'), /duplicate conflict key/);

const malformedLedger = cloneLedger(ledger);
malformedLedger.imports[0] = {
  ...malformedLedger.imports[0],
  span: {
    ...malformedLedger.imports[0].span,
    end: malformedLedger.imports[0].span.start - 1
  }
};
assert.match(validateSourceTriviaLedgerRecord(malformedLedger).join('\n'), /ends before it starts/);

function assertSlice(records, expected, label) {
  const match = records.find((record) => slice(record) === expected);
  assert.ok(match, `${label} should have exact span for ${JSON.stringify(expected)}`);
  assert.deepEqual(pickOffsets(match.span), {
    start: sourceText.indexOf(expected),
    end: sourceText.indexOf(expected) + expected.length
  });
  return match;
}

function slice(record) {
  return sourceText.slice(record.span.start, record.span.end);
}

function pickOffsets(span) {
  return { start: span.start, end: span.end };
}

function cloneLedger(record) {
  return JSON.parse(JSON.stringify(record));
}
