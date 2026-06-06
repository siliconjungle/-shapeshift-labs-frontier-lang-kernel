import { hashDocumentBase } from "./hashing.js";
import { applySemanticPatch } from "./patching.js";

export function verifyPatchReplayInvariants(initial, events, options = {}) {
  const initialHash = hashDocumentBase(initial);
  const steps = [];
  const issues = [];
  const seenEventIds = new Set();
  const seenPatchIds = new Set();
  let current = initial;
  let finalHash = initialHash;
  let replayComplete = true;

  for (const event of events) {
    const patch = event.patch;
    const beforeHash = hashDocumentBase(current);
    const step = {
      eventId: event.id,
      patchId: patch.id,
      beforeHash,
      ...(patch.baseHash ? { declaredBaseHash: patch.baseHash } : {}),
      ...(patch.targetHash ? { declaredTargetHash: patch.targetHash } : {}),
      status: "passed",
      issues: []
    };

    if (seenEventIds.has(event.id)) step.issues.push(`Duplicate replay event id: ${event.id}`);
    seenEventIds.add(event.id);
    if (seenPatchIds.has(patch.id)) step.issues.push(`Duplicate patch id: ${patch.id}`);
    seenPatchIds.add(patch.id);

    if (patch.baseHash && patch.baseHash !== beforeHash) {
      step.issues.push(`Patch ${patch.id} base hash ${patch.baseHash} does not match replay state ${beforeHash}`);
      failStep(step, steps, issues);
      replayComplete = false;
      break;
    }

    try {
      const next = applySemanticPatch(current, patch.targetHash ? { ...patch, targetHash: undefined } : patch, event);
      const afterHash = hashDocumentBase(next);
      step.afterHash = afterHash;
      if (patch.targetHash && patch.targetHash !== afterHash) {
        step.issues.push(`Patch ${patch.id} target hash ${patch.targetHash} does not match replay result ${afterHash}`);
        failStep(step, steps, issues);
        replayComplete = false;
        break;
      }
      current = next;
      finalHash = afterHash;
    } catch (error) {
      step.issues.push(`Patch ${patch.id} replay failed: ${error instanceof Error ? error.message : String(error)}`);
      failStep(step, steps, issues);
      replayComplete = false;
      break;
    }

    if (step.issues.length > 0) failStep(step, steps, issues);
    else steps.push(step);
  }

  const status = issues.length === 0 ? "passed" : "failed";
  const id = options.id ?? `patch-replay-invariants:${initial.id}`;
  return {
    kind: "frontier.lang.patchReplayInvariantReport",
    version: 1,
    id,
    status,
    replayComplete,
    initialHash,
    finalHash,
    eventCount: events.length,
    issues,
    steps,
    evidence: {
      id: options.evidenceId ?? `evidence:${id}`,
      kind: "replay",
      status,
      summary: status === "passed"
        ? `Patch replay completed with final hash ${finalHash}.`
        : `Patch replay failed ${issues.length} invariant check(s).`,
      metadata: {
        reportKind: "frontier.lang.patchReplayInvariantReport",
        reportId: id,
        documentId: initial.id,
        initialHash,
        finalHash,
        replayComplete,
        eventCount: events.length,
        issues,
        steps
      }
    }
  };
}

function failStep(step, steps, issues) {
  step.status = "failed";
  issues.push(...step.issues);
  steps.push(step);
}
