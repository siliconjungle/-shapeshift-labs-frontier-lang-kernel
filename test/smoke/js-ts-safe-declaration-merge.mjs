import assert from 'node:assert/strict';
import {
  collectTopLevelJsTsDeclarations,
  mergeTopLevelJsTsDeclarations
} from '../../dist/index.js';

{
  const base = "export interface User {\n  id: string;\n}\n";
  const addition = "export interface Settings {\n  theme: string;\n}";
  const right = `${base}\n${addition}\n`;
  const result = mergeTopLevelJsTsDeclarations({
    id: 'append-safe-top-level-declaration',
    language: 'typescript',
    sourcePath: 'src/model.ts',
    baseSource: base,
    leftSource: base,
    rightSource: right
  });

  assert.equal(result.classification, 'safe');
  assert.equal(result.autoMergeable, true);
  assert.equal(result.mergedSource, right);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.appliedDeclarations.length, 1);
  assert.equal(result.appliedDeclarations[0].text, addition);
}

{
  const user = "export interface User {\n  id: string;\n}";
  const profile = "export interface Profile {\n  displayName: string;\n}";
  const settings = "export interface Settings {\n    readonly theme : string\n}";
  const base = `${user}\n\n${profile}\n`;
  const right = `${user}\n\n${settings}\n\n${profile}\n`;
  const result = mergeTopLevelJsTsDeclarations({
    id: 'insert-safe-top-level-declaration',
    language: 'typescript',
    sourcePath: 'src/model.ts',
    baseSource: base,
    leftSource: base,
    rightSource: right
  });

  assert.equal(result.classification, 'safe');
  assert.equal(result.mergedSource, right);
  assert.equal(result.appliedDeclarations[0].anchor, 'after-previous-declaration');
  assert.equal(result.appliedDeclarations[0].text, settings);
}

{
  const base = "export interface User {\n  id: string;\n}\n";
  const left = `${base}\nexport interface CacheEntry {\n  key: string;\n}\n`;
  const right = `${base}\nexport interface CacheEntry {\n  value: string;\n}\n`;
  const result = mergeTopLevelJsTsDeclarations({
    id: 'same-name-conflict',
    language: 'typescript',
    sourcePath: 'src/model.ts',
    baseSource: base,
    leftSource: left,
    rightSource: right
  });

  assert.equal(result.classification, 'review-required');
  assert.equal(result.autoMergeable, false);
  assert.equal(result.mergedSource, undefined);
  assertConflictCode(result, 'js-ts.safe-merge.same-name-conflict');
}

{
  const base = "export const answer = 42;\n";
  const right = `${base}\nexport default function run() {\n  return answer;\n}\n`;
  const result = mergeTopLevelJsTsDeclarations({
    id: 'default-export-conflict',
    language: 'typescript',
    sourcePath: 'src/model.ts',
    baseSource: base,
    leftSource: base,
    rightSource: right
  });

  assert.equal(result.classification, 'review-required');
  assert.equal(result.autoMergeable, false);
  assertConflictCode(result, 'js-ts.safe-merge.default-export-ambiguity');
}

{
  const originalBase = "export interface User {\n  id: string;\n}\n";
  const shiftedBase = `// stale prefix\n${originalBase}`;
  const right = `${shiftedBase}\nexport interface Settings {\n  theme: string;\n}\n`;
  const result = mergeTopLevelJsTsDeclarations({
    id: 'stale-base-span-conflict',
    language: 'typescript',
    sourcePath: 'src/model.ts',
    baseSource: shiftedBase,
    leftSource: shiftedBase,
    rightSource: right,
    baseDeclarations: collectTopLevelJsTsDeclarations(originalBase, { sourcePath: 'src/model.ts' })
  });

  assert.equal(result.classification, 'review-required');
  assert.equal(result.autoMergeable, false);
  assertConflictCode(result, 'js-ts.safe-merge.stale-base-span');
}

function assertConflictCode(result, code) {
  assert.equal(
    result.conflicts.some((conflict) => conflict.metadata?.code === code),
    true,
    `expected conflict code ${code}`
  );
}
