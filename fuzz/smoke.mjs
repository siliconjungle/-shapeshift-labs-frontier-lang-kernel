import assert from 'node:assert/strict';
import {
  applySemanticPatch,
  classifyMerge,
  createDocument,
  createNativeAstMergeCandidate,
  createNativeAstRecord,
  createPatch,
  createSemanticIndexRecord,
  createSourceMapRecord,
  entityNode,
  hashDocumentBase,
  latticeNode,
  replayDocument,
  validateDocument
} from '../dist/index.js';

let seed = 0x12345678;
function next() {
  seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 12), 0x297a2d39) >>> 0;
  return (seed ^ (seed >>> 15)) >>> 0;
}

for (let index = 0; index < 100; index += 1) {
  const fieldCount = 1 + (next() % 8);
  const lattice = latticeNode({
    id: `lat_${index}`,
    name: `SetLattice${index}`,
    carrier: 'Set<Text>',
    laws: ['semilattice', 'commutative', 'associative', 'idempotent']
  });
  const fields = Array.from({ length: fieldCount }, (_, fieldIndex) => ({
    id: `field_${index}_${fieldIndex}`,
    name: `field${fieldIndex}`,
    type: fieldIndex % 2 === 0 ? 'Text' : { kind: 'set', item: 'Text' },
    merge: fieldIndex % 2 === 0 ? { kind: 'conflict' } : { kind: 'union', latticeId: lattice.id }
  }));
  const entity = entityNode({ id: `entity_${index}`, name: `Entity${index}`, fields });
  const document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [lattice, entity] });
  assert.deepEqual(validateDocument(document), []);
  const baseHash = hashDocumentBase(document);
  const rename = createPatch({ id: `rename_${index}`, baseHash, operations: [{ op: 'renameNode', id: entity.id, name: `EntityRenamed${index}` }] });
  const renamed = applySemanticPatch(document, rename);
  assert.equal(renamed.nodes[entity.id].name, `EntityRenamed${index}`);
  assert.equal(replayDocument(document, [{ id: `event_${index}`, patch: rename }]).nodes[entity.id].name, `EntityRenamed${index}`);
  const touched = fields.find((field) => field.merge?.latticeId)?.id ?? fields[0].id;
  const left = createPatch({ id: `left_${index}`, baseHash, operations: [{ op: 'addEvidence', evidence: { id: `left_${index}`, kind: 'test', status: 'passed' }, touches: [{ id: touched, access: 'write' }] }] });
  const right = createPatch({ id: `right_${index}`, baseHash, operations: [{ op: 'addEvidence', evidence: { id: `right_${index}`, kind: 'test', status: 'passed' }, touches: [{ id: touched, access: 'write' }] }] });
  assert.notEqual(classifyMerge(document, left, right).status, 'unknown-needs-review');
  const nativeAst = createNativeAstRecord({
    id: `native_${index}`,
    language: 'typescript',
    sourcePath: `src/entity_${index}.ts`,
    rootId: `native_root_${index}`,
    nodes: {
      [`native_root_${index}`]: { id: `native_root_${index}`, kind: 'SourceFile', children: [`native_entity_${index}`] },
      [`native_entity_${index}`]: {
        id: `native_entity_${index}`,
        kind: 'InterfaceDeclaration',
        span: { path: `src/entity_${index}.ts`, startLine: 1, startColumn: 1, endLine: 3, endColumn: 2 }
      }
    }
  });
  const semanticIndex = createSemanticIndexRecord({
    id: `index_${index}`,
    documents: [{ id: `doc_ts_${index}`, path: `src/entity_${index}.ts`, language: 'typescript' }],
    symbols: [{ id: `symbol_${index}`, name: entity.name, kind: 'interface', language: 'typescript', semanticNodeId: entity.id, nativeAstNodeId: `native_entity_${index}`, signatureHash: `hash_${index}` }],
    occurrences: [{ id: `occ_${index}`, documentId: `doc_ts_${index}`, symbolId: `symbol_${index}`, role: 'definition', semanticNodeId: entity.id, nativeAstNodeId: `native_entity_${index}`, span: { path: `src/entity_${index}.ts`, startLine: 1, startColumn: 1, endLine: 3, endColumn: 2 } }],
    relations: [],
    facts: []
  });
  const sourceMap = createSourceMapRecord({
    id: `sourcemap_${index}`,
    mappings: [{ id: `map_${index}`, semanticNodeId: entity.id, nativeAstNodeId: `native_entity_${index}`, sourceSpan: { path: `src/entity_${index}.ts`, startLine: 1, startColumn: 1, endLine: 3, endColumn: 2 }, precision: 'declaration' }]
  });
  const candidate = createNativeAstMergeCandidate({
    document,
    nativeAst,
    semanticIndex,
    sourceMaps: [sourceMap],
    evidence: [{ id: `evidence_${index}`, kind: 'test', status: 'passed' }]
  });
  assert.equal(candidate.conflictKeys.includes(`node:${entity.id}`), true);
  assert.equal(candidate.conflictKeys.includes(`sig:typescript:symbol_${index}:hash_${index}`), true);
}
