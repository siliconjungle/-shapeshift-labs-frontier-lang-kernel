import { performance } from 'node:perf_hooks';
import {
  classifyMerge,
  createDocument,
  createNativeAstMergeCandidate,
  createNativeAstRecord,
  createPatch,
  createSemanticIndexRecord,
  createSourceMapRecord,
  entityNode,
  hashDocumentBase,
  latticeNode
} from '../dist/index.js';

const fields = Array.from({ length: 200 }, (_, index) => ({
  id: `field_${index}`,
  name: `field${index}`,
  type: index % 2 === 0 ? 'Text' : { kind: 'set', item: 'Text' },
  merge: index % 2 === 0 ? { kind: 'conflict' } : { kind: 'union', latticeId: 'lat_tags' }
}));
const lattice = latticeNode({ id: 'lat_tags', name: 'TagSet', carrier: 'Set<Text>', laws: ['semilattice', 'commutative'] });
const entity = entityNode({ id: 'entity_big', name: 'BigEntity', fields });
const start = performance.now();
let document;
let candidate;
for (let index = 0; index < 500; index += 1) {
  document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [lattice, entity] });
  const baseHash = hashDocumentBase(document);
  const left = createPatch({ id: `left_${index}`, baseHash, operations: [{ op: 'addEvidence', evidence: { id: `left_${index}`, kind: 'test', status: 'passed' }, touches: [{ id: 'field_1', access: 'write' }] }] });
  const right = createPatch({ id: `right_${index}`, baseHash, operations: [{ op: 'addEvidence', evidence: { id: `right_${index}`, kind: 'test', status: 'passed' }, touches: [{ id: 'field_1', access: 'write' }] }] });
  classifyMerge(document, left, right);
}
const durationMs = performance.now() - start;
const nativeAst = createNativeAstRecord({
  id: 'native_bench',
  language: 'typescript',
  sourcePath: 'src/big.ts',
  rootId: 'native_root',
  nodes: Object.fromEntries([
    ['native_root', { id: 'native_root', kind: 'SourceFile', children: fields.map((field) => `native_${field.id}`) }],
    ...fields.map((field, index) => [`native_${field.id}`, {
      id: `native_${field.id}`,
      kind: 'PropertySignature',
      value: field.name,
      span: { path: 'src/big.ts', startLine: index + 1, startColumn: 1, endLine: index + 1, endColumn: 20 }
    }])
  ])
});
const semanticIndex = createSemanticIndexRecord({
  id: 'index_bench',
  documents: [{ id: 'doc_bench_ts', path: 'src/big.ts', language: 'typescript' }],
  symbols: fields.map((field) => ({ id: `symbol_${field.id}`, name: field.name, kind: 'field', language: 'typescript', semanticNodeId: entity.id, nativeAstNodeId: `native_${field.id}`, signatureHash: `hash_${field.id}` })),
  occurrences: fields.map((field, index) => ({ id: `occ_${field.id}`, documentId: 'doc_bench_ts', symbolId: `symbol_${field.id}`, role: 'definition', semanticNodeId: entity.id, nativeAstNodeId: `native_${field.id}`, span: { path: 'src/big.ts', startLine: index + 1, startColumn: 1, endLine: index + 1, endColumn: 20 } })),
  relations: [],
  facts: []
});
const sourceMap = createSourceMapRecord({
  id: 'sourcemap_bench',
  mappings: fields.map((field, index) => ({ id: `map_${field.id}`, semanticNodeId: entity.id, nativeAstNodeId: `native_${field.id}`, sourceSpan: { path: 'src/big.ts', startLine: index + 1, startColumn: 1, endLine: index + 1, endColumn: 20 }, precision: 'declaration' }))
});
const candidateStart = performance.now();
for (let index = 0; index < 250; index += 1) {
  candidate = createNativeAstMergeCandidate({
    document,
    nativeAst,
    semanticIndex,
    sourceMaps: [sourceMap],
    evidence: [{ id: 'native_bench_evidence', kind: 'test', status: 'passed' }]
  });
}
const candidateDurationMs = performance.now() - candidateStart;
console.log(JSON.stringify({
  documents: 500,
  fields: fields.length,
  durationMs: Math.round(durationMs * 100) / 100,
  nativeAstCandidates: 250,
  nativeAstConflictKeys: candidate.conflictKeys.length,
  nativeAstDurationMs: Math.round(candidateDurationMs * 100) / 100
}, null, 2));
