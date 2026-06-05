import assert from 'node:assert/strict';
import {
  applySemanticPatch,
  classifyMerge,
  createDocument,
  createPatch,
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
}
