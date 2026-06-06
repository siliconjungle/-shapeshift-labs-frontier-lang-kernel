import { unique } from "./shared.js";

export function inferNativeAstMergeReadiness(input) {
  const failedEvidence = input.evidence.filter((record) => record.status === "failed");
  if (failedEvidence.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Failed evidence prevents merge: ${failedEvidence.map((record) => record.id).join(", ")}`]
    };
  }

  const errorLosses = input.losses.filter((record) => record.severity === "error");
  if (errorLosses.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Native AST loss error(s) require repair: ${errorLosses.map((record) => record.id).join(", ")}`]
    };
  }

  if (input.touchedSymbols.length === 0 && input.touchedSemanticNodes.length === 0 && input.nativeSpans.length === 0) {
    return {
      readiness: "needs-review",
      reasons: ["Native AST candidate has no symbol, semantic node, or span anchors."]
    };
  }

  if (!input.evidence.some((record) => record.status === "passed")) {
    return {
      readiness: "needs-review",
      reasons: ["Native AST candidate has no passed evidence record."]
    };
  }

  if (input.losses.length > 0 || input.subtreeSummary.duplicateHashes.length > 0 || input.subtreeSummary.truncated) {
    return {
      readiness: "ready-with-losses",
      reasons: [
        "Native AST candidate has usable anchors but includes non-blocking loss or ambiguous subtree evidence."
      ]
    };
  }

  return {
    readiness: "ready",
    reasons: ["Native AST candidate has deterministic symbol/node/span anchors and passed evidence."]
  };
}

export function inferSemanticMergeReadiness(input) {
  const failedEvidence = input.evidence.filter((record) => record.status === "failed");
  if (failedEvidence.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Failed evidence prevents merge: ${failedEvidence.map((record) => record.id).join(", ")}`]
    };
  }

  const errorLosses = input.losses.filter((record) => record.severity === "error");
  if (errorLosses.length > 0) {
    return {
      readiness: "blocked",
      reasons: [`Native import loss error(s) require repair: ${errorLosses.map((record) => record.id).join(", ")}`]
    };
  }

  if (!input.patch) {
    return {
      readiness: "needs-review",
      reasons: ["No semantic patch was attached to the native import result."]
    };
  }

  if (input.patch.risk === "high" || input.patch.risk === "unknown") {
    return {
      readiness: "needs-review",
      reasons: [`Patch risk is ${input.patch.risk}.`]
    };
  }

  const dynamicEffects = new Set(["dynamic", "eval", "unsafeEval", "ffi", "reflection", "proxy"]);
  const dynamicTouched = input.patchSummary.effects.filter((effect) => dynamicEffects.has(effect));
  if (dynamicTouched.length > 0) {
    return {
      readiness: "needs-review",
      reasons: [`Patch touches dynamic effect boundary: ${unique(dynamicTouched).join(", ")}`]
    };
  }

  if (input.touchedSymbols.length === 0 && input.touchedSemanticNodes.length === 0) {
    return {
      readiness: "needs-review",
      reasons: ["Merge candidate has no touched symbols or semantic nodes."]
    };
  }

  if (input.losses.length > 0) {
    return {
      readiness: "ready-with-losses",
      reasons: [`Native import recorded non-blocking loss(es): ${input.losses.map((record) => record.id).join(", ")}`]
    };
  }

  return {
    readiness: "ready",
    reasons: ["Native import candidate has patch, semantic touches, and no blocking evidence."]
  };
}
