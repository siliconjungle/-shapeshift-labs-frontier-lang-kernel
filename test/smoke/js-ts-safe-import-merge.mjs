import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  JS_TS_SAFE_IMPORT_MERGE_STATUSES,
  createJsTsMergeContractRecord,
  jsTsImportIdentityKey,
  mergeJsTsSafeImports
} from '../../dist/index.js';

assert.deepEqual([...JS_TS_SAFE_IMPORT_MERGE_STATUSES], ['unchanged', 'merged', 'conflict']);

const sourcePath = 'src/load.ts';
const baseSource = '// Preserve module comments before imports.\n\nexport const value = 1;\n';
const addedImport = "import { readFile } from 'node:fs/promises';";
const leftSource = `// Preserve module comments before imports.\n\n${addedImport}\nexport const value = 1;\n`;
const rightSource = baseSource;

const safeMerge = mergeJsTsSafeImports({
  id: 'safe-static-import-add',
  language: 'typescript',
  sourcePath,
  baseSource,
  leftSource,
  rightSource,
  baseContract: contract([]),
  leftContract: contract([
    {
      id: 'import_read_file',
      importKind: 'value',
      moduleSpecifier: 'node:fs/promises',
      specifiers: [{ kind: 'named', importedName: 'readFile', localName: 'readFile' }],
      sourceSpan: spanOf(leftSource, addedImport)
    }
  ]),
  rightContract: contract([])
});

assert.equal(safeMerge.kind, 'frontier.lang.jsTsSafeImportMerge');
assert.equal(safeMerge.status, 'merged');
assert.equal(safeMerge.autoMergeable, true);
assert.equal(safeMerge.targetSide, 'right');
assert.equal(safeMerge.conflictSidecars.length, 0);
assert.equal(safeMerge.appliedImports.length, 1);
assert.equal(
  safeMerge.mergedSource,
  `// Preserve module comments before imports.\n\n${addedImport}\nexport const value = 1;\n`
);
assert.equal(safeMerge.mergedSource.startsWith('// Preserve module comments'), true);
assert.equal(safeMerge.edits[0].offset, baseSource.indexOf('export const value'));
assert.match(
  jsTsImportIdentityKey(safeMerge.appliedImports[0], { sourcePath }),
  /jsts-import/
);

const dynamicFixture = JSON.parse(await readFile(
  new URL('../fixtures/js-ts-semantic-merge/unsafe-import-dynamic.json', import.meta.url),
  'utf8'
));
const dynamicSource = dynamicFixture.source.left;
const dynamicImport = 'import(`./plugins/${name}.js`)';
const dynamicMerge = mergeJsTsSafeImports({
  id: 'dynamic-import-conflict',
  language: 'typescript',
  sourcePath: 'src/plugins.ts',
  baseSource: dynamicFixture.source.base,
  leftSource: dynamicSource,
  rightSource: dynamicFixture.source.right,
  baseContract: contract([]),
  leftContract: contract([
    {
      id: 'import_dynamic_plugin',
      importKind: 'dynamic',
      metadata: { dynamic: true },
      sourceSpan: spanOf(dynamicSource, dynamicImport)
    }
  ]),
  rightContract: contract([])
});

assert.equal(dynamicMerge.status, 'conflict');
assert.equal(dynamicMerge.autoMergeable, false);
assert.equal(dynamicMerge.edits.length, 0);
assert.equal(dynamicMerge.conflictSidecars[0].metadata.code, 'dynamic-import');

const existingImport = "import { readFile } from 'node:fs/promises';";
const rewrittenImport = "import { readFile, writeFile } from 'node:fs/promises';";
const baseWithImport = `${existingImport}\n\nexport const value = 1;\n`;
const leftWithRewrite = `${rewrittenImport}\n\nexport const value = 1;\n`;
const sameModuleMerge = mergeJsTsSafeImports({
  id: 'same-module-import-rewrite',
  language: 'typescript',
  sourcePath,
  baseSource: baseWithImport,
  leftSource: leftWithRewrite,
  rightSource: baseWithImport,
  baseContract: contract([
    {
      id: 'import_read_file',
      importKind: 'value',
      moduleSpecifier: 'node:fs/promises',
      specifiers: [{ kind: 'named', importedName: 'readFile', localName: 'readFile' }],
      sourceSpan: spanOf(baseWithImport, existingImport)
    }
  ]),
  leftContract: contract([
    {
      id: 'import_read_write_file',
      importKind: 'value',
      moduleSpecifier: 'node:fs/promises',
      specifiers: [
        { kind: 'named', importedName: 'readFile', localName: 'readFile' },
        { kind: 'named', importedName: 'writeFile', localName: 'writeFile' }
      ],
      sourceSpan: spanOf(leftWithRewrite, rewrittenImport)
    }
  ]),
  rightContract: contract([
    {
      id: 'import_read_file',
      importKind: 'value',
      moduleSpecifier: 'node:fs/promises',
      specifiers: [{ kind: 'named', importedName: 'readFile', localName: 'readFile' }],
      sourceSpan: spanOf(baseWithImport, existingImport)
    }
  ])
});

assert.equal(sameModuleMerge.status, 'conflict');
assert.equal(
  sameModuleMerge.conflictSidecars.some((sidecar) => sidecar.metadata.code === 'same-module-incompatible-rewrite'),
  true
);

const staleSource = `${addedImport}\nexport const value = 1;\n`;
const staleMerge = mergeJsTsSafeImports({
  id: 'stale-import-span',
  language: 'typescript',
  sourcePath,
  baseSource: 'export const value = 1;\n',
  leftSource: staleSource,
  rightSource: 'export const value = 1;\n',
  baseContract: contract([]),
  leftContract: contract([
    {
      id: 'import_stale',
      importKind: 'value',
      moduleSpecifier: 'node:fs/promises',
      specifiers: [{ kind: 'named', importedName: 'readFile', localName: 'readFile' }],
      sourceSpan: spanOf(staleSource, 'export const value = 1;')
    }
  ]),
  rightContract: contract([])
});

assert.equal(staleMerge.status, 'conflict');
assert.equal(staleMerge.edits.length, 0);
assert.equal(staleMerge.conflictSidecars[0].metadata.code, 'stale-span');

function contract(imports) {
  return createJsTsMergeContractRecord({
    language: 'typescript',
    sourcePath,
    imports
  });
}

function spanOf(source, text) {
  const start = source.indexOf(text);
  assert.notEqual(start, -1, `missing source text ${text}`);
  return { path: sourcePath, start, end: start + text.length };
}
