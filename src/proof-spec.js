import { createUniversalAstReferenceIndex, inferReferenceSubjectKind, validateReferenceId, validateReferenceIds } from "./reference-index.js";
import { collectUniqueIds, validateSourceSpan } from "./shared.js";

export function createProofSpecLayer(input = {}) {
  const contracts = normalizeProofRecords(input.contracts, "contract");
  const refinements = normalizeProofRecords(input.refinements, "refinement");
  const invariants = normalizeProofRecords(input.invariants, "invariant");
  const termination = normalizeProofRecords(input.termination, "termination");
  const temporal = normalizeProofRecords(input.temporal, "temporal");
  const obligations = normalizeProofRecords(input.obligations, "obligation");
  const artifacts = normalizeProofRecords(input.artifacts, "artifact");
  const assumptions = normalizeProofRecords(input.assumptions, "assumption");
  return {
    ...input,
    kind: "frontier.lang.proofSpec",
    version: 1,
    id: input.id ?? "proof:spec",
    contracts,
    refinements,
    invariants,
    termination,
    temporal,
    obligations,
    artifacts,
    assumptions,
    evidence: input.evidence ?? []
  };
}

export function validateProofSpecLayer(proof, context = {}) {
  const issues = [];
  if (!proof || typeof proof !== "object") {
    return ["Proof spec is not an object"];
  }
  const label = `Proof spec ${proof.id ?? "(unknown)"}`;
  const references = createUniversalAstReferenceIndex({ ...context, proof });
  if (proof.kind !== "frontier.lang.proofSpec") {
    issues.push(`${label} has invalid kind`);
  }
  if (proof.version !== 1) {
    issues.push(`${label} has unsupported version ${proof.version}`);
  }
  if (!proof.id) {
    issues.push("Proof spec is missing id");
  }

  validateProofRecords(proof.contracts, "contract", references, issues);
  validateProofRecords(proof.refinements, "refinement", references, issues);
  validateProofRecords(proof.invariants, "invariant", references, issues);
  validateProofRecords(proof.termination, "termination", references, issues);
  validateProofRecords(proof.temporal, "temporal", references, issues);
  validateProofObligations(proof.obligations, references, issues);
  validateProofArtifacts(proof.artifacts, references, issues);
  validateProofAssumptions(proof.assumptions, references, issues);
  for (const evidence of proof.evidence ?? []) {
    if (!evidence?.id) {
      issues.push(`${label} has evidence without id`);
    }
  }
  return issues;
}

function normalizeProofRecords(records, prefix) {
  return (records ?? []).map((record, index) => ({
    ...record,
    id: record.id ?? `${prefix}:${index + 1}`,
    evidenceIds: record.evidenceIds ?? []
  }));
}

function validateProofRecords(records, group, references, issues) {
  collectUniqueIds(records ?? [], group, issues);
  for (const record of records ?? []) {
    const label = `Proof ${group} ${record?.id ?? "(unknown)"}`;
    if (!record?.id) {
      issues.push(`Proof ${group} is missing id`);
      continue;
    }
    if (!record.kind) {
      issues.push(`${label} is missing kind`);
    }
    if (!record.statement && !record.expression) {
      issues.push(`${label} is missing statement or expression`);
    }
    validateProofSubject(record, label, references, issues);
    validateReferenceIds(record.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
    validateReferenceIds(record.lossIds, references.lossIds, "loss", label, references, issues);
    validateReferenceId(record.sourceMapId, references.sourceMapIds, "source map", label, references, issues);
    validateReferenceId(record.sourceMapMappingId, references.sourceMapMappingIds, "source map mapping", label, references, issues);
    validateSourceSpan(record.sourceSpan, `${label} source span`, issues);
    validateSourceSpan(record.generatedSpan, `${label} generated span`, issues);
  }
}

function validateProofObligations(obligations, references, issues) {
  collectUniqueIds(obligations ?? [], "proof obligation", issues);
  for (const obligation of obligations ?? []) {
    const label = `Proof obligation ${obligation?.id ?? "(unknown)"}`;
    if (!obligation?.id) {
      issues.push("Proof obligation is missing id");
      continue;
    }
    if (!obligation.kind) {
      issues.push(`${label} is missing kind`);
    }
    if (!obligation.status) {
      issues.push(`${label} is missing status`);
    }
    if (!obligation.statement && !obligation.expression) {
      issues.push(`${label} is missing statement or expression`);
    }
    validateProofSubject(obligation, label, references, issues);
    validateReferenceIds(obligation.contractIds, references.proofContractIds, "proof contract", label, references, issues);
    validateReferenceIds(obligation.assumptionIds, references.proofAssumptionIds, "proof assumption", label, references, issues);
    validateReferenceIds(obligation.artifactIds, references.proofArtifactIds, "proof artifact", label, references, issues);
    validateReferenceIds(obligation.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
    validateReferenceIds(obligation.lossIds, references.lossIds, "loss", label, references, issues);
    validateSourceSpan(obligation.sourceSpan, `${label} source span`, issues);
  }
}

function validateProofArtifacts(artifacts, references, issues) {
  collectUniqueIds(artifacts ?? [], "proof artifact", issues);
  for (const artifact of artifacts ?? []) {
    const label = `Proof artifact ${artifact?.id ?? "(unknown)"}`;
    if (!artifact?.id) {
      issues.push("Proof artifact is missing id");
      continue;
    }
    if (!artifact.kind) {
      issues.push(`${label} is missing kind`);
    }
    validateReferenceIds(artifact.obligationIds, references.proofObligationIds, "proof obligation", label, references, issues);
    validateReferenceIds(artifact.assumptionIds, references.proofAssumptionIds, "proof assumption", label, references, issues);
    validateReferenceIds(artifact.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
  }
}

function validateProofAssumptions(assumptions, references, issues) {
  collectUniqueIds(assumptions ?? [], "proof assumption", issues);
  for (const assumption of assumptions ?? []) {
    const label = `Proof assumption ${assumption?.id ?? "(unknown)"}`;
    if (!assumption?.id) {
      issues.push("Proof assumption is missing id");
      continue;
    }
    if (!assumption.scope) {
      issues.push(`${label} is missing scope`);
    }
    validateProofSubject(assumption, label, references, issues);
    validateReferenceIds(assumption.evidenceIds, references.evidenceIds, "evidence", label, references, issues);
  }
}

function validateProofSubject(record, label, references, issues) {
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
        issues.push(`${label} references unknown proof subject ${record.subjectId}`);
      }
      break;
  }
}
