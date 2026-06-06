import { ParadigmSemanticsRecordGroups, ParadigmSemanticsRecordPrefixes } from "./constants.js";
import { collectParadigmRecords } from "./paradigm-records.js";
import { createUniversalAstReferenceIndex, inferReferenceSubjectKind, validateReferenceId, validateReferenceIds } from "./reference-index.js";
import { collectUniqueIds, validateSourceSpan } from "./shared.js";

export function createParadigmSemanticsLayer(input = {}) {
  const records = {};
  for (const group of ParadigmSemanticsRecordGroups) {
    records[group] = normalizeParadigmRecords(input[group], ParadigmSemanticsRecordPrefixes[group]);
  }
  return {
    ...input,
    kind: "frontier.lang.paradigmSemantics",
    version: 1,
    id: input.id ?? "paradigm:semantics",
    ...records,
    evidence: input.evidence ?? []
  };
}

export function validateParadigmSemanticsLayer(paradigmSemantics, context = {}) {
  const issues = [];
  if (!paradigmSemantics || typeof paradigmSemantics !== "object") {
    return ["Paradigm semantics is not an object"];
  }
  const label = `Paradigm semantics ${paradigmSemantics.id ?? "(unknown)"}`;
  const references = createUniversalAstReferenceIndex({ ...context, paradigmSemantics });
  if (paradigmSemantics.kind !== "frontier.lang.paradigmSemantics") {
    issues.push(`${label} has invalid kind`);
  }
  if (paradigmSemantics.version !== 1) {
    issues.push(`${label} has unsupported version ${paradigmSemantics.version}`);
  }
  if (!paradigmSemantics.id) {
    issues.push("Paradigm semantics is missing id");
  }

  const recordIds = collectUniqueIds(collectParadigmRecords(paradigmSemantics), "paradigm record", issues);
  for (const group of ParadigmSemanticsRecordGroups) {
    validateParadigmRecords(paradigmSemantics[group], group, recordIds, references, issues);
  }
  for (const evidence of paradigmSemantics.evidence ?? []) {
    if (!evidence?.id) {
      issues.push(`${label} has evidence without id`);
    }
  }
  return issues;
}

function normalizeParadigmRecords(records, prefix) {
  return (records ?? []).map((record, index) => ({
    ...record,
    id: record.id ?? `${prefix}:${index + 1}`,
    kind: record.kind ?? prefix,
    evidenceIds: record.evidenceIds ?? [],
    lossIds: record.lossIds ?? [],
    effectIds: record.effectIds ?? [],
    relatedRecordIds: record.relatedRecordIds ?? []
  }));
}

function validateParadigmRecords(records, group, paradigmRecordIds, references, issues) {
  for (const record of records ?? []) {
    const label = `Paradigm ${group} record ${record?.id ?? "(unknown)"}`;
    if (!record?.id) {
      issues.push(`Paradigm ${group} record is missing id`);
      continue;
    }
    if (!record.kind) {
      issues.push(`${label} is missing kind`);
    }
    validateParadigmSubject(record, label, references, issues);
    validateReferenceId(record.semanticNodeId, references.semanticNodeIds, "semantic node", label, references, issues);
    validateReferenceId(record.semanticSymbolId, references.semanticSymbolIds, "semantic symbol", label, references, issues);
    validateReferenceId(record.semanticOccurrenceId, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
    validateReferenceId(record.nativeSourceId, references.nativeSourceIds, "native source", label, references, issues);
    validateReferenceId(record.nativeAstId, references.nativeAstIds, "native AST", label, references, issues);
    validateReferenceId(record.nativeAstNodeId, references.nativeAstNodeIds, "native AST node", label, references, issues);
    validateReferenceId(record.sourceMapId, references.sourceMapIds, "source map", label, references, issues);
    validateReferenceId(record.sourceMapMappingId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
    validateReferenceIds(record.effectIds, references.effectIds, "effect", label, references, issues);
    validateReferenceIds(record.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
    validateReferenceIds(record.lossIds, references.lossIds, "loss", label, references, issues);
    validateReferenceIds(record.relatedRecordIds, paradigmRecordIds, "paradigm record", label, references, issues);
    for (const field of [
      "bindingScopeId",
      "parentScopeId",
      "bindingId",
      "patternId",
      "typeConstraintId",
      "evaluationModelId",
      "memoryLocationId",
      "effectRegionId",
      "controlRegionId",
      "logicProgramId",
      "actorSystemId",
      "stackEffectId",
      "arrayShapeId",
      "numericKernelId",
      "dataflowNetworkId",
      "clockModelId",
      "objectModelId",
      "macroExpansionId",
      "reflectionBoundaryId",
      "loweringRecordId",
      "sourceRecordId",
      "targetRecordId"
    ]) {
      validateReferenceId(record[field], paradigmRecordIds, "paradigm record", label, references, issues);
    }
    validateSourceSpan(record.sourceSpan, `${label} source span`, issues);
    validateSourceSpan(record.generatedSpan, `${label} generated span`, issues);
  }
}

function validateParadigmSubject(record, label, references, issues) {
  if (!record?.subjectId) {
    return;
  }
  const kind = record.subjectKind ?? inferReferenceSubjectKind(record.subjectId, references);
  switch (kind) {
    case "semanticNode":
      validateReferenceId(record.subjectId, references.semanticNodeIds, "semantic node", label, references, issues);
      break;
    case "semanticSymbol":
      validateReferenceId(record.subjectId, references.semanticSymbolIds, "semantic symbol", label, references, issues);
      break;
    case "semanticOccurrence":
      validateReferenceId(record.subjectId, references.semanticOccurrenceIds, "semantic occurrence", label, references, issues);
      break;
    case "semanticRelation":
      validateReferenceId(record.subjectId, references.semanticRelationIds, "semantic relation", label, references, issues);
      break;
    case "semanticFact":
      validateReferenceId(record.subjectId, references.semanticFactIds, "semantic fact", label, references, issues);
      break;
    case "nativeSource":
      validateReferenceId(record.subjectId, references.nativeSourceIds, "native source", label, references, issues);
      break;
    case "nativeAst":
      validateReferenceId(record.subjectId, references.nativeAstIds, "native AST", label, references, issues);
      break;
    case "nativeAstNode":
      validateReferenceId(record.subjectId, references.nativeAstNodeIds, "native AST node", label, references, issues);
      break;
    case "sourceMap":
      validateReferenceId(record.subjectId, references.sourceMapIds, "source map", label, references, issues);
      break;
    case "sourceMapMapping":
      validateReferenceId(record.subjectId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
      break;
    case "effect":
      validateReferenceId(record.subjectId, references.effectIds, "effect", label, references, issues);
      break;
    default:
      if (references.strict) {
        issues.push(`${label} references unknown paradigm subject ${record.subjectId}`);
      }
      break;
  }
}
