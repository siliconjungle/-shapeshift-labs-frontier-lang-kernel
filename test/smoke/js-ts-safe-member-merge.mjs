import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  classifyJsTsSafeMemberMerge,
  collectJsTsSafeMergeBodies,
  createJsTsMemberRecord,
  createJsTsMergeContractRecord,
  createJsTsTopLevelDeclarationRecord
} from '../../dist/index.js';

const fixturesUrl = new URL('../fixtures/js-ts-semantic-merge/', import.meta.url);
const safeMemberAdd = await readFixture('safe-member-add.json');
const safeFixtureResult = classifyJsTsSafeMemberMerge({
  id: 'fixture-safe-member-add',
  language: safeMemberAdd.language,
  ...safeMemberAdd.source
});

assert.equal(safeFixtureResult.classification, 'safe-member-add');
assert.equal(safeFixtureResult.autoMergeable, true);
assert.equal(safeFixtureResult.mergedSource, safeMemberAdd.source.right);
assert.deepEqual(safeFixtureResult.safeAdds[0].members.map((member) => member.name), ['email']);
assert.equal(safeFixtureResult.safeAdds[0].members[0].stableKey, true);

const safeBodyCases = [
  {
    bodyKind: 'interface',
    memberName: 'email',
    base: 'export interface Profile {\n  id: string;\n}\n',
    right: 'export interface Profile {\n  id: string;\n  email: string;\n}\n'
  },
  {
    bodyKind: 'type',
    memberName: 'email',
    base: 'export type Profile = {\n  id: string;\n};\n',
    right: 'export type Profile = {\n  id: string;\n  email: string;\n};\n'
  },
  {
    bodyKind: 'class',
    memberName: 'email',
    base: 'export class Profile {\n  id = "";\n}\n',
    right: 'export class Profile {\n  id = "";\n  email = "";\n}\n'
  },
  {
    bodyKind: 'object',
    memberName: 'email',
    base: 'export const profile = {\n  id: "",\n};\n',
    right: 'export const profile = {\n  id: "",\n  email: "",\n};\n'
  }
];

for (const testCase of safeBodyCases) {
  const result = classifyJsTsSafeMemberMerge({
    sourcePath: `src/${testCase.bodyKind}.ts`,
    base: testCase.base,
    left: testCase.base,
    right: testCase.right
  });
  assert.equal(result.classification, 'safe-member-add', `${testCase.bodyKind} classification`);
  assert.equal(result.autoMergeable, true, `${testCase.bodyKind} autoMergeable`);
  assert.equal(result.mergedSource, testCase.right, `${testCase.bodyKind} mergedSource`);
  assert.equal(result.bodies.base[0].bodyKind, testCase.bodyKind, `${testCase.bodyKind} bodyKind`);
  assert.deepEqual(result.safeAdds[0].members.map((member) => member.name), [testCase.memberName], `${testCase.bodyKind} member`);
}

const collectedTypeBodies = collectJsTsSafeMergeBodies(safeBodyCases[1].right, { sourcePath: 'src/profile.ts' });
assert.equal(collectedTypeBodies[0].bodySpan.start < collectedTypeBodies[0].members[0].sourceSpan.start, true);
assert.equal(collectedTypeBodies[0].members[1].name, 'email');

const computedKeyConflict = classifyJsTsSafeMemberMerge({
  base: 'export interface Profile {\n  id: string;\n}\n',
  left: 'export interface Profile {\n  id: string;\n}\n',
  right: 'export interface Profile {\n  id: string;\n  [email]: string;\n}\n'
});
assert.equal(computedKeyConflict.classification, 'conflict');
assert.equal(computedKeyConflict.autoMergeable, false);
assert.match(computedKeyConflict.conflicts.map((conflict) => conflict.reasons.join('\n')).join('\n'), /computed member key/i);

const duplicateNameConflict = classifyJsTsSafeMemberMerge({
  base: 'export interface Profile {\n  id: string;\n}\n',
  left: 'export interface Profile {\n  id: string;\n}\n',
  right: 'export interface Profile {\n  id: string;\n  email: string;\n  email: number;\n}\n'
});
assert.equal(duplicateNameConflict.classification, 'conflict');
assert.equal(duplicateNameConflict.autoMergeable, false);
assert.match(duplicateNameConflict.conflicts.map((conflict) => conflict.reasons.join('\n')).join('\n'), /duplicate member name/i);

const computedMemberFixture = await readFixture('computed-member-conflict.json');
const mutualEditConflict = classifyJsTsSafeMemberMerge({
  id: 'fixture-computed-member-conflict',
  language: computedMemberFixture.language,
  ...computedMemberFixture.source
});
assert.equal(mutualEditConflict.classification, 'conflict');
assert.equal(mutualEditConflict.autoMergeable, false);
assert.match(mutualEditConflict.conflicts[0].reasons.join('\n'), /Both sides changed member body/);

const declarationWithoutBodySpan = createJsTsTopLevelDeclarationRecord({
  declarationKind: 'interface',
  name: 'Profile',
  sourceSpan: { path: 'src/profile.ts', start: 0, end: 44 },
  memberIds: ['member_profile_id']
});
const memberWithSpan = createJsTsMemberRecord({
  id: 'member_profile_id',
  ownerDeclarationId: declarationWithoutBodySpan.id,
  memberKind: 'property',
  name: 'id',
  sourceSpan: { path: 'src/profile.ts', start: 29, end: 40 }
});
const missingSpanContract = createJsTsMergeContractRecord({
  id: 'contract_missing_body_span',
  sourcePath: 'src/profile.ts',
  topLevelDeclarations: [declarationWithoutBodySpan],
  members: [memberWithSpan]
});
const missingBodySpanConflict = classifyJsTsSafeMemberMerge({
  baseContract: missingSpanContract,
  leftContract: missingSpanContract,
  rightContract: missingSpanContract
});

assert.equal(missingBodySpanConflict.classification, 'conflict');
assert.equal(missingBodySpanConflict.autoMergeable, false);
assert.match(missingBodySpanConflict.conflicts[0].reasons.join('\n'), /missing numeric body spans/i);

async function readFixture(file) {
  return JSON.parse(await readFile(new URL(file, fixturesUrl), 'utf8'));
}
