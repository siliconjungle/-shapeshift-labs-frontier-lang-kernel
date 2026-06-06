import assert from 'node:assert/strict';
import {
  createSourceMapRecord,
  createSourcePreservationRecord,
  explainSourcePreservation,
  validateDocument,
  validateSemanticIndexRecord,
  validateSourceMapRecord
} from '../../dist/index.js';
import { createTodoKernelFixture } from './kernel-fixture.mjs';

const { document, nativeAst, nativeTodo, semanticIndex, sourceMap } = createTodoKernelFixture();

assert.deepEqual(validateDocument(document), []);
assert.equal(document.nodes.cap_http_request.adapters[1].target.language, 'rust');
assert.deepEqual(validateSemanticIndexRecord(semanticIndex), []);
assert.deepEqual(validateSourceMapRecord(sourceMap, {
  document,
  nativeSources: [nativeTodo],
  nativeAst,
  semanticIndex,
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence]
}), []);

const exactSourceMap = createSourceMapRecord({
  id: 'sourcemap_exact_todo_ts',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'map_exact_title',
    semanticNodeId: 'ent_todo',
    nativeSourceId: 'native_source_todo',
    nativeAstNodeId: 'native_todo_interface',
    semanticSymbolId: 'symbol:Todo',
    semanticOccurrenceId: 'occ_todo_def',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 3 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 3 },
    precision: 'exact'
  }]
});
const estimatedLoss = {
  id: 'loss_estimated_initializer',
  severity: 'warning',
  kind: 'sourceMapApproximation',
  message: 'Initializer body was preserved with estimated source offsets.',
  sourceMapId: 'sourcemap_estimated_todo_ts',
  sourceMapMappingId: 'map_estimated_initializer',
  evidenceIds: ['estimate_review'],
  preservation: 'estimated'
};
const blockedLoss = {
  id: 'loss_blocked_macro',
  severity: 'error',
  kind: 'macroExpansion',
  message: 'Macro expansion cannot be round-tripped to the native source declaration.',
  sourceMapId: 'sourcemap_blocked_todo_ts',
  sourceMapMappingId: 'map_blocked_macro',
  evidenceIds: ['macro_review'],
  preservation: 'blocked'
};
const estimatedSourceMap = createSourceMapRecord({
  id: 'sourcemap_estimated_todo_ts',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'map_estimated_initializer',
    semanticNodeId: 'ent_todo',
    sourceSpan: { path: 'src/todo.ts', startLine: 6 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 6 },
    precision: 'estimated',
    preservation: 'estimated',
    evidenceIds: ['estimate_review'],
    lossIds: ['loss_estimated_initializer']
  }],
  evidence: [{ id: 'estimate_review', kind: 'review', status: 'passed', summary: 'Reviewed estimated initializer mapping.' }]
});
const blockedSourceMap = createSourceMapRecord({
  id: 'sourcemap_blocked_todo_ts',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'map_blocked_macro',
    semanticNodeId: 'ent_todo',
    sourceSpan: { path: 'src/todo.ts', startLine: 8 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 8 },
    precision: 'unknown',
    preservation: 'blocked',
    evidenceIds: ['macro_review'],
    lossIds: ['loss_blocked_macro']
  }],
  evidence: [{ id: 'macro_review', kind: 'review', status: 'failed', summary: 'Macro expansion blocked source preservation.' }]
});

assert.equal(explainSourcePreservation({
  sourceMap: exactSourceMap,
  mappingId: 'map_exact_title'
}).level, 'exact');
assert.equal(explainSourcePreservation({
  sourceMap,
  mappingId: 'map_todo_interface',
  losses: nativeAst.losses,
  evidence: [...semanticIndex.evidence, ...sourceMap.evidence]
}).level, 'declaration');
const estimatedPreservation = explainSourcePreservation({
  sourceMap: estimatedSourceMap,
  mappingId: 'map_estimated_initializer',
  losses: [estimatedLoss]
});
assert.equal(estimatedPreservation.level, 'estimated');
assert.deepEqual(estimatedPreservation.lossIds, ['loss_estimated_initializer']);
assert.match(estimatedPreservation.reasons[0], /estimated/);
const blockedPreservation = explainSourcePreservation({
  sourceMap: blockedSourceMap,
  mappingId: 'map_blocked_macro',
  losses: [blockedLoss]
});
assert.equal(blockedPreservation.level, 'blocked');
assert.deepEqual(blockedPreservation.lossIds, ['loss_blocked_macro']);
assert.match(blockedPreservation.reasons[0], /blocked/);
assert.deepEqual(createSourcePreservationRecord({
  id: 'manual_preservation',
  level: 'declaration',
  precision: 'declaration',
  sourceMapId: 'sourcemap_todo_ts',
  sourceMapMappingId: 'map_todo_interface',
  losses: nativeAst.losses,
  evidence: sourceMap.evidence,
  reasons: ['Manual declaration-level review.']
}).evidenceIds, ['sourcemap_build']);

assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_sourcemap',
  mappings: [
    { id: 'dup', semanticNodeId: 'missing_node', precision: 'exact' },
    { id: 'dup', sourceSpan: { path: 'src/todo.ts', start: 10, end: 1 }, precision: 'line' }
  ]
}), { document }).join('\n'), /duplicate mapping id dup/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_sourcemap_span',
  mappings: [{ id: 'bad_span', sourceSpan: { path: 'src/todo.ts', startLine: 4, startColumn: 2, endLine: 1, endColumn: 1 }, precision: 'line' }]
}), {}).join('\n'), /end line is before start line/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_exact_precision',
  sourcePath: 'src/todo.ts',
  targetPath: 'generated/todo.ts',
  mappings: [{
    id: 'bad_exact',
    sourceSpan: { path: 'src/todo.ts', startLine: 2 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact'
  }]
})).join('\n'), /exact precision requires a source span/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_dangling_links',
  mappings: [{
    id: 'bad_links',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact',
    evidenceIds: ['missing_evidence'],
    lossIds: ['missing_loss']
  }]
}), {
  losses: [{ id: 'known_loss', severity: 'warning', kind: 'sourcePreservation', message: 'Known loss.' }],
  evidence: [{ id: 'known_evidence', kind: 'review', status: 'passed' }]
}).join('\n'), /references missing evidence missing_evidence/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_loss_links',
  mappings: [{
    id: 'ok_mapping',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact'
  }]
}), {
  sourceMaps: [createSourceMapRecord({ id: 'bad_loss_links' })],
  losses: [{
    id: 'loss_bad_source_map',
    severity: 'warning',
    kind: 'sourcePreservation',
    message: 'Dangling source map link.',
    sourceMapId: 'missing_sourcemap',
    sourceMapMappingId: 'missing_mapping',
    evidenceIds: ['missing_loss_evidence']
  }],
  evidence: [{ id: 'known_evidence', kind: 'review', status: 'passed' }]
}).join('\n'), /references missing source map missing_sourcemap/);
assert.match(validateSourceMapRecord(createSourceMapRecord({
  id: 'bad_loss_mapping_links',
  mappings: [{
    id: 'ok_mapping',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 1 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 2, startColumn: 1 },
    precision: 'exact'
  }]
}), {
  losses: [{
    id: 'loss_bad_mapping',
    severity: 'warning',
    kind: 'sourcePreservation',
    message: 'Dangling source map mapping link.',
    sourceMapId: 'bad_loss_mapping_links',
    sourceMapMappingId: 'missing_mapping',
    evidenceIds: ['missing_loss_evidence']
  }],
  evidence: [{ id: 'known_evidence', kind: 'review', status: 'passed' }]
}).join('\n'), /references missing source map mapping missing_mapping/);

const pointSourceMap = createSourceMapRecord({
  id: 'sourcemap_point',
  mappings: [{
    id: 'map_point',
    sourceSpan: { path: 'src/todo.ts', startLine: 2, startColumn: 5 },
    generatedSpan: { path: 'generated/todo.ts', startLine: 8, startColumn: 1 },
    precision: 'exact',
    metadata: { rawGeneratedLine0: 7, rawGeneratedColumn0: 0, rawSourceLine0: 1, rawSourceColumn0: 4 }
  }],
  metadata: { format: 'source-map-v3', sectionOffset: { line: 7, column: 0 } }
});
assert.deepEqual(validateSourceMapRecord(pointSourceMap), []);
assert.equal(pointSourceMap.mappings[0].metadata.rawGeneratedLine0, 7);
