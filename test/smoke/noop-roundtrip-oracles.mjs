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
    expectedClassification: 'safe',
    requiredFeatures: ['comment', 'whitespace', 'importDeclaration', 'exportDeclaration', 'classDeclaration', 'classMember', 'templateLiteral']
  },
  {
    path: 'test/fixtures/noop-roundtrip/exported-types.ts.fixture',
    language: 'typescript',
    expectedClassification: 'safe',
    requiredFeatures: ['comment', 'whitespace', 'importDeclaration', 'exportDeclaration', 'interfaceDeclaration', 'interfaceMember', 'classMember', 'templateLiteral']
  },
  {
    path: 'test/fixtures/noop-roundtrip/decorators-overloads-objects.ts.fixture',
    language: 'typescript',
    expectedClassification: 'safe',
    requiredFeatures: [
      'comment',
      'whitespace',
      'importDeclaration',
      'exportDeclaration',
      'decorator',
      'functionDeclaration',
      'overloadDeclaration',
      'interfaceDeclaration',
      'interfaceMember',
      'typeAliasDeclaration',
      'objectLiteral',
      'classDeclaration',
      'classMember'
    ]
  },
  {
    path: 'test/fixtures/noop-roundtrip/jsxish-stale-malformed.ts.fixture',
    language: 'typescript',
    expectedClassification: 'lossy',
    requiredFeatures: [
      'comment',
      'whitespace',
      'importDeclaration',
      'exportDeclaration',
      'functionDeclaration',
      'objectLiteral',
      'jsxishText',
      'staleSnippet',
      'malformedSnippet'
    ],
    requiredDiagnostics: ['jsxish', 'malformed', 'stale']
  },
  {
    path: 'test/fixtures/noop-roundtrip/decorated-overloads-jsx.ts.fixture',
    language: 'typescript',
    expectedClassification: 'lossy',
    requiredFeatures: ['comment', 'whitespace', 'importDeclaration', 'exportDeclaration', 'interfaceDeclaration', 'interfaceMember', 'classDeclaration', 'classMember', 'templateLiteral', 'jsxishText'],
    requiredDiagnostics: ['jsxish'],
    requiredSnippets: ['@sealed', 'render(input: string): RenderNode;', 'export type RenderNode', 'const props = {', '<Panel title={title}']
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
  assert.equal(report.classification, fixture.expectedClassification);
  assert.equal(report.evidence.status, 'passed');
  assert.equal(report.evidence.metadata.classification, fixture.expectedClassification);
  assert.deepEqual(report.evidence.metadata.featureSummary, report.featureSummary);
  assert.equal(report.featureMetadata.sourceBytePreservation, 'segment-complete');
  assert.deepEqual(report.issues, []);
  for (const feature of fixture.requiredFeatures) {
    assert.ok(
      (scan.featureSummary[feature] ?? 0) > 0,
      `${fixture.path} should scan at least one ${feature}`
    );
    assert.ok(
      report.featureMetadata.featureKinds.includes(feature),
      `${fixture.path} feature metadata should include ${feature}`
    );
  }
  for (const diagnostic of fixture.requiredDiagnostics ?? []) {
    assert.ok(
      report.featureMetadata.diagnosticKinds.includes(diagnostic),
      `${fixture.path} should include ${diagnostic} diagnostic metadata`
    );
  }
  if (fixture.expectedClassification === 'lossy') {
    assert.ok(report.classificationReasons.length > 0, `${fixture.path} should explain lossy classification`);
    assert.ok(report.featureMetadata.lossyFeatureKinds.length > 0, `${fixture.path} should record lossy feature kinds`);
  }
  for (const snippet of fixture.requiredSnippets ?? []) {
    assert.ok(sourceText.includes(snippet), `${fixture.path} should include ${snippet}`);
    assert.ok(reconstructed.includes(snippet), `${fixture.path} should preserve ${snippet}`);
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
assert.equal(failedReport.classification, 'failed');
assert.equal(failedReport.evidence.kind, 'test');
assert.equal(failedReport.evidence.status, 'failed');
assert.match(failedReport.issues.join('\n'), /No-op source roundtrip changed/);
assert.equal(failedReport.evidence.metadata.reportKind, 'frontier.lang.sourceNoopRoundtripReport');
assert.equal(failedReport.evidence.metadata.classification, 'failed');
assert.ok(failedReport.classificationReasons.length > 0);
assert.equal(failedReport.evidence.metadata.firstDifference.offset, failedReport.firstDifference.offset);
