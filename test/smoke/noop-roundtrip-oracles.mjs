import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import {
  reconstructSourceRoundtrip,
  scanSourceRoundtrip,
  verifyNoopSourceRoundtrip
} from '../../dist/index.js';

const fixtures = [
  {
    path: 'test/fixtures/noop-roundtrip/imports-template-class.js.fixture',
    language: 'javascript',
    requiredFeatures: ['comment', 'whitespace', 'importDeclaration', 'exportDeclaration', 'classDeclaration', 'classMember', 'templateLiteral']
  },
  {
    path: 'test/fixtures/noop-roundtrip/exported-types.ts.fixture',
    language: 'typescript',
    requiredFeatures: ['comment', 'whitespace', 'importDeclaration', 'exportDeclaration', 'interfaceDeclaration', 'interfaceMember', 'classMember', 'templateLiteral']
  }
];

for (const fixture of fixtures) {
  const sourceBuffer = readFileSync(new URL(`../fixtures/noop-roundtrip/${fixture.path.split('/').at(-1)}`, import.meta.url));
  const sourceText = sourceBuffer.toString('utf8');
  const scan = scanSourceRoundtrip({
    id: `scan:${fixture.path}`,
    path: fixture.path,
    language: fixture.language,
    sourceText
  });
  const reconstructed = reconstructSourceRoundtrip(scan);
  const report = verifyNoopSourceRoundtrip({
    reportId: `report:${fixture.path}`,
    evidenceId: `evidence:${fixture.path}`,
    path: fixture.path,
    language: fixture.language,
    sourceText,
    scan
  });

  assert.equal(Buffer.compare(sourceBuffer, Buffer.from(reconstructed, 'utf8')), 0);
  assert.equal(report.status, 'passed');
  assert.equal(report.evidence.status, 'passed');
  assert.deepEqual(report.issues, []);
  for (const feature of fixture.requiredFeatures) {
    assert.ok(
      (scan.featureSummary[feature] ?? 0) > 0,
      `${fixture.path} should scan at least one ${feature}`
    );
  }
}

const failedReport = verifyNoopSourceRoundtrip({
  reportId: 'report:source-roundtrip-failure-probe',
  evidenceId: 'evidence:source-roundtrip-failure-probe',
  path: 'test/fixtures/noop-roundtrip/failure-probe.ts',
  language: 'typescript',
  sourceText: 'export const value = `source`;\n',
  reconstructedText: 'export const value = `changed`;\n'
});

assert.equal(failedReport.status, 'failed');
assert.equal(failedReport.evidence.kind, 'test');
assert.equal(failedReport.evidence.status, 'failed');
assert.match(failedReport.issues.join('\n'), /No-op source roundtrip changed/);
assert.equal(failedReport.evidence.metadata.reportKind, 'frontier.lang.sourceNoopRoundtripReport');
assert.equal(failedReport.evidence.metadata.firstDifference.offset, failedReport.firstDifference.offset);
