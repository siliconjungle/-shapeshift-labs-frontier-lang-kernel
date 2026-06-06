import {
  createParadigmSemanticsLayer,
  createProofSpecLayer
} from '../../dist/index.js';
import { createTodoKernelFixture } from './kernel-fixture.mjs';

export function createProofParadigmFixture() {
  const base = createTodoKernelFixture();
  const proofEvidence = { id: 'proof_dafny_check', kind: 'proof', status: 'passed', summary: 'Dafny-style contract obligation was discharged.' };
  const proofSpec = createProofSpecLayer({
    id: 'proof_todo',
    contracts: [{
      id: 'contract_todo_title_pre',
      kind: 'precondition',
      subjectKind: 'semanticNode',
      subjectId: 'ent_todo',
      expression: 'title.length > 0',
      language: 'frontier',
      evidenceIds: ['proof_dafny_check']
    }],
    invariants: [{
      id: 'invariant_todo_tags_set',
      kind: 'invariant',
      subjectKind: 'semanticSymbol',
      subjectId: 'symbol:Todo',
      statement: 'tags is a join-semilattice',
      evidenceIds: ['proof_dafny_check']
    }],
    obligations: [{
      id: 'obligation_todo_title',
      kind: 'contract',
      status: 'discharged',
      subjectKind: 'semanticNode',
      subjectId: 'ent_todo',
      contractIds: ['contract_todo_title_pre'],
      artifactIds: ['artifact_solver_todo'],
      statement: 'Todo title precondition holds before save.',
      evidenceIds: ['proof_dafny_check']
    }],
    artifacts: [{
      id: 'artifact_solver_todo',
      kind: 'solverRun',
      status: 'discharged',
      obligationIds: ['obligation_todo_title'],
      evidenceIds: ['proof_dafny_check'],
      summary: 'SMT solver discharged precondition.'
    }],
    assumptions: [{
      id: 'assumption_ts_runtime',
      scope: 'runtime',
      subjectKind: 'effect',
      subjectId: 'http.request',
      description: 'Fetch transport obeys the declared response contract.',
      evidenceIds: ['proof_dafny_check']
    }],
    evidence: [proofEvidence]
  });
  const paradigmEvidence = {
    id: 'paradigm_import_review',
    kind: 'import',
    status: 'passed',
    summary: 'Imported mixed-paradigm semantic facets for lexical, logic, stack, array, and lowering records.'
  };
  const paradigmSemantics = createParadigmSemanticsLayer({
    id: 'paradigm_todo',
    bindingScopes: [{
      id: 'scope_todo_entity',
      kind: 'lexicalScope',
      scopeKind: 'entity',
      semanticNodeId: 'ent_todo',
      nativeSourceId: 'native_source_todo',
      nativeAstId: 'native_ts_todo',
      nativeAstNodeId: 'native_todo_interface',
      evidenceIds: ['paradigm_import_review']
    }],
    bindings: [{
      id: 'binding_todo_title',
      kind: 'fieldBinding',
      name: 'title',
      bindingScopeId: 'scope_todo_entity',
      subjectKind: 'semanticSymbol',
      subjectId: 'symbol:Todo',
      semanticNodeId: 'ent_todo',
      semanticSymbolId: 'symbol:Todo',
      evidenceIds: ['paradigm_import_review']
    }],
    patterns: [{
      id: 'pattern_todo_record',
      kind: 'recordPattern',
      bindingId: 'binding_todo_title',
      shape: { fields: ['title', 'tags'] },
      evidenceIds: ['paradigm_import_review']
    }],
    typeConstraints: [{
      id: 'type_title_text',
      kind: 'structuralConstraint',
      bindingId: 'binding_todo_title',
      expression: 'title: Text',
      evidenceIds: ['paradigm_import_review']
    }],
    evaluationModels: [{
      id: 'eval_save_eager',
      kind: 'eagerEvaluation',
      semanticNodeId: 'extern_save_todo',
      strategy: 'callByValue',
      evidenceIds: ['paradigm_import_review']
    }],
    memoryLocations: [{
      id: 'memory_todo_heap',
      kind: 'heapObject',
      evaluationModelId: 'eval_save_eager',
      storage: 'managed',
      evidenceIds: ['paradigm_import_review']
    }],
    effectRegions: [{
      id: 'effect_http_region',
      kind: 'asyncEffectRegion',
      semanticNodeId: 'effect_fetch_todo',
      effectIds: ['http.request'],
      evidenceIds: ['paradigm_import_review']
    }],
    controlRegions: [{
      id: 'control_save_linear',
      kind: 'sequentialControl',
      semanticNodeId: 'extern_save_todo',
      evaluationModelId: 'eval_save_eager',
      evidenceIds: ['paradigm_import_review']
    }],
    logicPrograms: [{
      id: 'logic_todo_valid',
      kind: 'hornClause',
      predicate: 'valid_todo(Title) :- non_empty(Title)',
      subjectKind: 'semanticNode',
      subjectId: 'ent_todo',
      evidenceIds: ['paradigm_import_review']
    }],
    actorSystems: [{
      id: 'actor_todo_worker',
      kind: 'mailboxActor',
      mailbox: 'todo.updates',
      effectRegionId: 'effect_http_region',
      evidenceIds: ['paradigm_import_review']
    }],
    stackEffects: [{
      id: 'stack_validate_title',
      kind: 'concatenativeStackEffect',
      inputs: ['title'],
      outputs: ['valid?'],
      relatedRecordIds: ['logic_todo_valid'],
      evidenceIds: ['paradigm_import_review']
    }],
    arrayShapes: [{
      id: 'array_tags_rank1',
      kind: 'rankedArray',
      semanticNodeId: 'ent_todo',
      rank: 1,
      elementType: 'Text',
      evidenceIds: ['paradigm_import_review']
    }],
    numericKernels: [{
      id: 'kernel_tag_count',
      kind: 'elementalKernel',
      arrayShapeId: 'array_tags_rank1',
      operation: 'count(tags)',
      evidenceIds: ['paradigm_import_review']
    }],
    dataflowNetworks: [{
      id: 'dataflow_todo_pipeline',
      kind: 'demandDataflow',
      relatedRecordIds: ['kernel_tag_count', 'effect_http_region'],
      evidenceIds: ['paradigm_import_review']
    }],
    clockModels: [{
      id: 'clock_runtime_tick',
      kind: 'eventLoopClock',
      effectRegionId: 'effect_http_region',
      evidenceIds: ['paradigm_import_review']
    }],
    objectModels: [{
      id: 'object_todo_structural',
      kind: 'structuralObject',
      semanticNodeId: 'ent_todo',
      memoryLocationId: 'memory_todo_heap',
      evidenceIds: ['paradigm_import_review']
    }],
    macroExpansions: [{
      id: 'macro_todo_generated',
      kind: 'decoratorExpansion',
      sourceMapId: 'sourcemap_todo_ts',
      sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface',
      lossIds: ['loss_decorator'],
      evidenceIds: ['paradigm_import_review']
    }],
    reflectionBoundaries: [{
      id: 'reflection_fetch_adapter',
      kind: 'foreignRuntimeBoundary',
      effectIds: ['http.request'],
      relatedRecordIds: ['effect_http_region'],
      evidenceIds: ['paradigm_import_review']
    }],
    loweringRecords: [{
      id: 'lower_ts_to_frontier_todo',
      kind: 'nativeToFrontier',
      sourceRecordId: 'macro_todo_generated',
      targetRecordId: 'object_todo_structural',
      sourceMapId: 'sourcemap_todo_ts',
      sourceMapMappingId: 'sourcemap_todo_ts:map_todo_interface',
      lossIds: ['loss_decorator'],
      evidenceIds: ['paradigm_import_review']
    }],
    evidence: [paradigmEvidence]
  });

  return {
    ...base,
    paradigmEvidence,
    paradigmSemantics,
    proofEvidence,
    proofSpec
  };
}
