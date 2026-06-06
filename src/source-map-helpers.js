import { SourcePreservationLevels } from "./constants.js";
import { uniqueById } from "./shared.js";

export function collectNativeSourceIds(document, nativeSources) {
  return new Set([
    ...(nativeSources ?? []).map((source) => source.id),
    ...Object.values(document?.nodes ?? {})
      .filter((node) => node.kind === "nativeSource")
      .map((node) => node.id)
  ]);
}

export function collectNativeAstNodeIds(nativeAst, nativeSources) {
  return new Set([
    ...Object.keys(nativeAst?.nodes ?? {}),
    ...(nativeSources ?? []).flatMap((source) => Object.keys(source.ast?.nodes ?? {}))
  ]);
}

export function validateSourceMapMappingPrecision(mapping, sourceMap, label, issues) {
  if (!mapping.precision) {
    return;
  }

  if (
    mapping.preservation &&
    SourcePreservationLevels.includes(mapping.preservation) &&
    mapping.preservation === "blocked" &&
    (mapping.lossIds ?? []).length === 0
  ) {
    issues.push(`${label} has blocked preservation without a linked loss`);
  }

  switch (mapping.precision) {
    case "exact": {
      if (!mapping.sourceSpan || !hasExactSpanPosition(mapping.sourceSpan, sourceMap.sourcePath)) {
        issues.push(`${label} exact precision requires a source span with path/sourceId and line/column or offset coordinates`);
      }
      if (!mapping.generatedSpan || !hasExactSpanPosition(mapping.generatedSpan, sourceMap.targetPath)) {
        issues.push(`${label} exact precision requires a generated span with path/sourceId and line/column or offset coordinates`);
      }
      break;
    }
    case "declaration": {
      if (!mapping.semanticNodeId && !mapping.semanticSymbolId && !mapping.semanticOccurrenceId && !mapping.nativeAstNodeId) {
        issues.push(`${label} declaration precision requires a semantic, symbol, occurrence, or native AST declaration anchor`);
      }
      if (!hasAnySpanPosition(mapping.sourceSpan) && !hasAnySpanPosition(mapping.generatedSpan)) {
        issues.push(`${label} declaration precision requires a source or generated span`);
      }
      break;
    }
    case "line": {
      if (!hasLineSpan(mapping.sourceSpan) && !hasLineSpan(mapping.generatedSpan)) {
        issues.push(`${label} line precision requires a line span`);
      }
      break;
    }
    case "estimated":
    case "unknown": {
      if ((mapping.lossIds ?? []).length === 0 && (mapping.evidenceIds ?? []).length === 0) {
        issues.push(`${label} ${mapping.precision} precision requires linked loss or evidence`);
      }
      break;
    }
    default:
      break;
  }
}

export function hasExactSpanPosition(span, fallbackPath) {
  return Boolean((span?.path || span?.sourceId || fallbackPath) && (
    typeof span.start === "number" ||
    (typeof span.startLine === "number" && typeof span.startColumn === "number")
  ));
}

export function hasAnySpanPosition(span) {
  return Boolean(span && (
    typeof span.start === "number" ||
    typeof span.end === "number" ||
    typeof span.startLine === "number" ||
    typeof span.endLine === "number"
  ));
}

export function hasLineSpan(span) {
  return Boolean(span && (typeof span.startLine === "number" || typeof span.endLine === "number"));
}

export function collectLinkedSourcePreservationLosses(losses, input) {
  const lossIds = new Set(input.lossIds ?? []);
  return uniqueById(losses.filter((loss) => {
    if (!loss?.id) {
      return false;
    }
    if (lossIds.has(loss.id)) {
      return true;
    }
    if (input.sourceMapId && loss.sourceMapId === input.sourceMapId) {
      return !input.mappingId || !loss.sourceMapMappingId || loss.sourceMapMappingId === input.mappingId;
    }
    return false;
  }));
}

export function inferSourcePreservationLevel(mapping, losses) {
  if (!mapping) {
    return "blocked";
  }
  if (losses.some((record) => record.severity === "error")) {
    return "blocked";
  }
  if (mapping.preservation && SourcePreservationLevels.includes(mapping.preservation)) {
    return mapping.preservation;
  }
  if (mapping.precision === "exact") {
    return "exact";
  }
  if (mapping.precision === "declaration") {
    return "declaration";
  }
  if (mapping.precision === "estimated" || mapping.precision === "line" || mapping.precision === "unknown") {
    return "estimated";
  }
  if (losses.length > 0) {
    return "estimated";
  }
  return "estimated";
}

export function explainSourcePreservationReasons(input) {
  if (!input.mapping) {
    return ["No source map mapping is available for this preservation record."];
  }
  if (input.level === "blocked") {
    const lossIds = input.losses.map((record) => record.id);
    return lossIds.length > 0
      ? [`Preservation is blocked by loss record(s): ${lossIds.join(", ")}`]
      : ["Preservation is blocked because no precise source mapping is available."];
  }
  if (input.level === "exact") {
    return ["Source and generated positions are preserved with exact mapping precision."];
  }
  if (input.level === "declaration") {
    return ["Source preservation is anchored at declaration level for semantic merge review."];
  }
  const lossIds = input.losses.map((record) => record.id);
  const evidenceIds = input.evidence.map((record) => record.id);
  const details = [
    lossIds.length > 0 ? `losses: ${lossIds.join(", ")}` : "",
    evidenceIds.length > 0 ? `evidence: ${evidenceIds.join(", ")}` : ""
  ].filter(Boolean);
  return details.length > 0
    ? [`Source preservation is estimated and linked to ${details.join("; ")}.`]
    : ["Source preservation is estimated and should be reviewed before relying on span-level merge keys."];
}
