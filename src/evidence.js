import { collectParadigmRecords } from "./paradigm-records.js";
import { unique, uniqueById } from "./shared.js";

export function uniqueEvidence(records) {
  return uniqueById(records);
}

export function collectPatchEvidence(patch) {
  const evidence = [...(patch.evidence ?? [])];
  for (const operation of patch.operations) {
    if (operation.op === "addEvidence") {
      evidence.push(operation.evidence);
    }
  }
  return evidence;
}

export function collectProofEvidenceIds(proof) {
  if (!proof) return [];
  return unique([
    ...(proof.evidence ?? []).map((record) => record.id),
    ...proof.contracts.flatMap((record) => record.evidenceIds ?? []),
    ...proof.refinements.flatMap((record) => record.evidenceIds ?? []),
    ...proof.invariants.flatMap((record) => record.evidenceIds ?? []),
    ...proof.termination.flatMap((record) => record.evidenceIds ?? []),
    ...proof.temporal.flatMap((record) => record.evidenceIds ?? []),
    ...proof.obligations.flatMap((record) => record.evidenceIds ?? []),
    ...proof.artifacts.flatMap((record) => record.evidenceIds ?? []),
    ...proof.assumptions.flatMap((record) => record.evidenceIds ?? [])
  ].filter(Boolean));
}

export function collectParadigmEvidenceIds(paradigmSemantics) {
  if (!paradigmSemantics) return [];
  return unique([
    ...(paradigmSemantics.evidence ?? []).map((record) => record.id),
    ...collectParadigmRecords(paradigmSemantics).flatMap((record) => record.evidenceIds ?? [])
  ].filter(Boolean));
}

export function collectLinkedSourcePreservationEvidence(evidence, input) {
  const evidenceIds = new Set(input.evidenceIds ?? []);
  return uniqueEvidence(evidence.filter((record) => record?.id && evidenceIds.has(record.id)));
}
