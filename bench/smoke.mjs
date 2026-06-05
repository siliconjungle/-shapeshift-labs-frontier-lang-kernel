import { performance } from 'node:perf_hooks';
import {
  classifyMerge,
  createDocument,
  createPatch,
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
for (let index = 0; index < 500; index += 1) {
  document = createDocument({ id: `doc_${index}`, name: `Doc${index}`, nodes: [lattice, entity] });
  const baseHash = hashDocumentBase(document);
  const left = createPatch({ id: `left_${index}`, baseHash, operations: [{ op: 'addEvidence', evidence: { id: `left_${index}`, kind: 'test', status: 'passed' }, touches: [{ id: 'field_1', access: 'write' }] }] });
  const right = createPatch({ id: `right_${index}`, baseHash, operations: [{ op: 'addEvidence', evidence: { id: `right_${index}`, kind: 'test', status: 'passed' }, touches: [{ id: 'field_1', access: 'write' }] }] });
  classifyMerge(document, left, right);
}
const durationMs = performance.now() - start;
console.log(JSON.stringify({ documents: 500, fields: fields.length, durationMs: Math.round(durationMs * 100) / 100 }, null, 2));
