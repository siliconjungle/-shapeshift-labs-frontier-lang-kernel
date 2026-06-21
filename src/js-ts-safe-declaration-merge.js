import { classifyTopLevelJsTsDeclarationMerge } from "./js-ts-declarations.js";
import { createJsTsConflictSidecarRecord } from "./js-ts-merge-contracts.js";
import { ordinalCompare } from "./shared.js";

export const JS_TS_SAFE_MERGE_CLASSIFICATIONS = Object.freeze([
  "unchanged",
  "safe",
  "review-required"
]);

export function mergeTopLevelJsTsDeclarations(input = {}, options = {}) {
  const normalized = normalizeSafeMergeInput(input, options);
  const admission = classifyTopLevelJsTsDeclarationMerge(normalized, normalized);
  const spanConflicts = validateDeclarationSpans(admission, normalized);
  const admissionConflicts = [
    ...spanConflicts,
    ...admission.conflicts.map((conflict) => createAdmissionConflict(conflict)),
    ...admission.safeByMergeLaw.map((classification) => createMergeLawConflict(classification))
  ];
  const defaultConflicts = defaultExportSafeAddConflicts(admission.safeAdds);
  const conflicts = uniqueConflicts([...admissionConflicts, ...defaultConflicts]);

  if (conflicts.length > 0) {
    return createSafeMergeResult({
      normalized,
      admission,
      classification: "review-required",
      autoMergeable: false,
      conflicts
    });
  }

  const additions = collectSafeAddDeclarations(admission.safeAdds);
  if (additions.length === 0) {
    return createSafeMergeResult({
      normalized,
      admission,
      classification: "unchanged",
      autoMergeable: true,
      mergedSource: normalized.baseSource,
      appliedDeclarations: []
    });
  }

  const planned = planDeclarationInsertions(additions, admission, normalized);
  if (planned.conflicts.length > 0) {
    return createSafeMergeResult({
      normalized,
      admission,
      classification: "review-required",
      autoMergeable: false,
      conflicts: planned.conflicts
    });
  }

  return createSafeMergeResult({
    normalized,
    admission,
    classification: "safe",
    autoMergeable: true,
    mergedSource: applyInsertions(normalized.baseSource, planned.insertions),
    appliedDeclarations: planned.appliedDeclarations
  });
}

export const mergeSafeTopLevelJsTsDeclarations = mergeTopLevelJsTsDeclarations;

function normalizeSafeMergeInput(input, options) {
  const merged = { ...options, ...(input ?? {}) };
  return {
    ...merged,
    baseSource: merged.baseSource ?? merged.base ?? "",
    leftSource: merged.leftSource ?? merged.left ?? "",
    rightSource: merged.rightSource ?? merged.right ?? "",
    mergeLaws: merged.mergeLaws ?? []
  };
}

function createSafeMergeResult(input) {
  return {
    kind: "frontier.lang.jsTsSafeTopLevelDeclarationMerge",
    version: 1,
    id: input.normalized.id ?? "jsts-safe-top-level-declaration-merge",
    classification: input.classification,
    autoMergeable: input.autoMergeable,
    ...(typeof input.mergedSource === "string" ? { mergedSource: input.mergedSource } : {}),
    appliedDeclarations: input.appliedDeclarations ?? [],
    conflicts: input.conflicts ?? [],
    admission: input.admission,
    metadata: {
      sourcePath: input.normalized.sourcePath,
      language: input.normalized.language,
      ...(input.normalized.metadata ?? {})
    }
  };
}

function validateDeclarationSpans(admission, normalized) {
  return [
    ...validateSpansForSide("base", normalized.baseSource, admission.declarations.base),
    ...validateSpansForSide("left", normalized.leftSource, admission.declarations.left),
    ...validateSpansForSide("right", normalized.rightSource, admission.declarations.right)
  ];
}

function validateSpansForSide(side, source, declarations) {
  const conflicts = [];
  for (const declaration of declarations) {
    const span = declaration.span;
    if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) {
      conflicts.push(createSpanConflict(side, declaration, "Declaration is missing a concrete source span."));
      continue;
    }
    if (span.start < 0 || span.end < span.start || span.end > source.length) {
      conflicts.push(createSpanConflict(side, declaration, "Declaration source span is outside the current source."));
      continue;
    }
    if (source.slice(span.start, span.end) !== declaration.text) {
      conflicts.push(createSpanConflict(side, declaration, "Declaration source span is stale for the current source."));
    }
  }
  return conflicts;
}

function createSpanConflict(side, declaration, reason) {
  return createJsTsConflictSidecarRecord({
    id: conflictId("stale-span", side, declaration.identityKey ?? declaration.id),
    conflictKind: "custom",
    targetKind: "sourceSpan",
    targetId: declaration.id,
    sides: [{
      side,
      recordId: declaration.id,
      sourceSpan: declaration.span,
      contentHash: declaration.contentHash,
      conflictKeys: declaration.conflictKeys,
      payload: { declarationKey: declaration.identityKey }
    }],
    metadata: {
      code: side === "base"
        ? "js-ts.safe-merge.stale-base-span"
        : "js-ts.safe-merge.stale-side-span",
      classification: "review-required",
      reasons: [reason]
    }
  });
}

function createAdmissionConflict(conflict) {
  const code = admissionConflictCode(conflict);
  return createJsTsConflictSidecarRecord({
    id: conflictId(code, conflict.side, conflict.declarationKey),
    conflictKind: code.endsWith("same-name-conflict") ? "overlap" : "custom",
    targetKind: "topLevelDeclaration",
    targetId: conflict.declarationKey,
    sides: conflictSides(conflict),
    metadata: {
      code,
      classification: "review-required",
      declarationKey: conflict.declarationKey,
      changeKind: conflict.changeKind,
      reasons: conflict.reasons
    }
  });
}

function admissionConflictCode(conflict) {
  if (conflict.declarationKey.endsWith(":default")) {
    return "js-ts.safe-merge.default-export-ambiguity";
  }
  if (conflict.side === "both" && conflict.changeKind === "add") {
    return "js-ts.safe-merge.same-name-conflict";
  }
  return "js-ts.safe-merge.declaration-conflict";
}

function createMergeLawConflict(classification) {
  return createJsTsConflictSidecarRecord({
    id: conflictId("merge-law-review", classification.side, classification.declarationKey),
    conflictKind: "custom",
    targetKind: "topLevelDeclaration",
    targetId: classification.declarationKey,
    sides: conflictSides(classification),
    metadata: {
      code: "js-ts.safe-merge.merge-law-review-required",
      classification: "review-required",
      declarationKey: classification.declarationKey,
      reasons: ["Top-level declaration source merging only auto-applies one-sided additions."]
    }
  });
}

function defaultExportSafeAddConflicts(safeAdds) {
  const conflicts = [];
  for (const classification of safeAdds) {
    const declarations = changedDeclarationsForClassification(classification);
    for (const declaration of declarations) {
      if (!declaration.defaultExport) {
        continue;
      }
      conflicts.push(createJsTsConflictSidecarRecord({
        id: conflictId("default-export-ambiguity", classification.side, declaration.id),
        conflictKind: "custom",
        targetKind: "topLevelDeclaration",
        targetId: declaration.id,
        sides: declarationSideRecords(classification.side, [declaration]),
        metadata: {
          code: "js-ts.safe-merge.default-export-ambiguity",
          classification: "review-required",
          declarationKey: classification.declarationKey,
          reasons: ["Default export additions are ambiguous for conservative source merge."]
        }
      }));
    }
  }
  return conflicts;
}

function collectSafeAddDeclarations(safeAdds) {
  const declarations = [];
  const seen = new Set();
  const safeKeys = new Set(safeAdds.map((classification) => classification.declarationKey));
  for (const classification of safeAdds) {
    if (classification.side !== "left" && classification.side !== "right") {
      continue;
    }
    for (const declaration of changedDeclarationsForClassification(classification)) {
      const declarationKeys = declaration.declarationKeys ?? [];
      if (!declarationKeys.every((key) => safeKeys.has(key))) {
        continue;
      }
      const key = declarationInstanceKey(classification.side, declaration);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      declarations.push({ side: classification.side, declaration });
    }
  }
  return declarations.sort((left, right) =>
    sideOrder(left.side) - sideOrder(right.side) ||
    (left.declaration.span?.start ?? 0) - (right.declaration.span?.start ?? 0) ||
    ordinalCompare(left.declaration.identityKey, right.declaration.identityKey)
  );
}

function planDeclarationInsertions(additions, admission, normalized) {
  const conflicts = [];
  const insertions = [];
  const appliedDeclarations = [];

  for (const side of ["left", "right"]) {
    const sideAdditions = additions
      .filter((addition) => addition.side === side)
      .map((addition) => addition.declaration);
    if (sideAdditions.length === 0) {
      continue;
    }
    const source = side === "left" ? normalized.leftSource : normalized.rightSource;
    const plan = planSideInsertions({
      side,
      source,
      baseSource: normalized.baseSource,
      baseDeclarations: admission.declarations.base,
      sideDeclarations: side === "left" ? admission.declarations.left : admission.declarations.right,
      sideAdditions
    });
    conflicts.push(...plan.conflicts);
    insertions.push(...plan.insertions);
    appliedDeclarations.push(...plan.appliedDeclarations);
  }

  return {
    conflicts: uniqueConflicts(conflicts),
    insertions,
    appliedDeclarations: appliedDeclarations.sort((left, right) =>
      left.insertOffset - right.insertOffset ||
      sideOrder(left.side) - sideOrder(right.side) ||
      ordinalCompare(left.declarationKey, right.declarationKey)
    )
  };
}

function planSideInsertions(input) {
  const additionKeys = new Set(input.sideAdditions.map((declaration) => declarationInstanceKey(input.side, declaration)));
  const insertions = [];
  const removals = [];
  const appliedDeclarations = [];
  const conflicts = [];
  let index = 0;

  while (index < input.sideDeclarations.length) {
    const declaration = input.sideDeclarations[index];
    if (!additionKeys.has(declarationInstanceKey(input.side, declaration))) {
      index += 1;
      continue;
    }

    const firstIndex = index;
    let lastIndex = index;
    while (
      lastIndex + 1 < input.sideDeclarations.length &&
      additionKeys.has(declarationInstanceKey(input.side, input.sideDeclarations[lastIndex + 1]))
    ) {
      lastIndex += 1;
    }

    const run = input.sideDeclarations.slice(firstIndex, lastIndex + 1);
    const anchor = findRunAnchor(input, firstIndex, lastIndex);
    if (!anchor) {
      conflicts.push(createUnanchoredConflict(input.side, run));
      index = lastIndex + 1;
      continue;
    }

    insertions.push({
      offset: anchor.baseOffset,
      text: input.source.slice(anchor.segmentStart, anchor.segmentEnd),
      side: input.side,
      order: anchor.segmentStart
    });
    removals.push({ start: anchor.segmentStart, end: anchor.segmentEnd });
    for (const added of run) {
      appliedDeclarations.push({
        declarationKey: added.identityKey,
        side: input.side,
        text: added.text,
        insertOffset: anchor.baseOffset,
        anchor: anchor.kind,
        sourceSpan: added.span
      });
    }

    index = lastIndex + 1;
  }

  const projectedBase = removeRanges(input.source, removals);
  if (projectedBase !== input.baseSource) {
    conflicts.push(createSourceProjectionConflict(input.side, input.sideAdditions));
  }

  return { insertions, appliedDeclarations, conflicts };
}

function findRunAnchor(input, firstIndex, lastIndex) {
  const first = input.sideDeclarations[firstIndex];
  const last = input.sideDeclarations[lastIndex];
  const previous = findPreviousBaseAnchor(input, firstIndex);
  if (previous) {
    return {
      kind: "after-previous-declaration",
      baseOffset: previous.base.span.end,
      segmentStart: previous.side.span.end,
      segmentEnd: last.span.end
    };
  }
  const next = findNextBaseAnchor(input, lastIndex);
  if (next) {
    return {
      kind: "before-next-declaration",
      baseOffset: next.base.span.start,
      segmentStart: first.span.start,
      segmentEnd: next.side.span.start
    };
  }
  if (input.baseSource.length === 0) {
    return {
      kind: "whole-file",
      baseOffset: 0,
      segmentStart: 0,
      segmentEnd: input.source.length
    };
  }
  if (input.source.startsWith(input.baseSource)) {
    return {
      kind: "append",
      baseOffset: input.baseSource.length,
      segmentStart: input.baseSource.length,
      segmentEnd: input.source.length
    };
  }
  return undefined;
}

function findPreviousBaseAnchor(input, startIndex) {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const side = input.sideDeclarations[index];
    const base = findMatchingBaseDeclaration(side, input.baseDeclarations);
    if (base) {
      return { side, base };
    }
  }
  return undefined;
}

function findNextBaseAnchor(input, startIndex) {
  for (let index = startIndex + 1; index < input.sideDeclarations.length; index += 1) {
    const side = input.sideDeclarations[index];
    const base = findMatchingBaseDeclaration(side, input.baseDeclarations);
    if (base) {
      return { side, base };
    }
  }
  return undefined;
}

function findMatchingBaseDeclaration(sideDeclaration, baseDeclarations) {
  return baseDeclarations.find((base) =>
    base.identityKey === sideDeclaration.identityKey &&
    base.contentHash === sideDeclaration.contentHash &&
    base.normalizedText === sideDeclaration.normalizedText
  );
}

function createUnanchoredConflict(side, declarations) {
  return createJsTsConflictSidecarRecord({
    id: conflictId("unanchored-add", side, declarations.map((declaration) => declaration.id).join(",")),
    conflictKind: "order",
    targetKind: "topLevelDeclaration",
    targetId: declarations[0]?.id,
    sides: declarationSideRecords(side, declarations),
    metadata: {
      code: "js-ts.safe-merge.unanchored-add",
      classification: "review-required",
      reasons: ["New top-level declaration has no stable base anchor."]
    }
  });
}

function createSourceProjectionConflict(side, declarations) {
  return createJsTsConflictSidecarRecord({
    id: conflictId("source-projection", side, declarations.map((declaration) => declaration.id).join(",")),
    conflictKind: "custom",
    targetKind: "sourceSpan",
    sides: declarationSideRecords(side, declarations),
    metadata: {
      code: "js-ts.safe-merge.source-projection-mismatch",
      classification: "review-required",
      reasons: ["Removing planned top-level declaration insertions from the changed side does not reproduce the base source."]
    }
  });
}

function applyInsertions(baseSource, insertions) {
  const byOffset = new Map();
  for (const insertion of insertions) {
    const group = byOffset.get(insertion.offset) ?? [];
    group.push(insertion);
    byOffset.set(insertion.offset, group);
  }

  let merged = baseSource;
  const offsets = [...byOffset.keys()].sort((left, right) => right - left);
  for (const offset of offsets) {
    const text = byOffset.get(offset)
      .sort((left, right) =>
        sideOrder(left.side) - sideOrder(right.side) ||
        left.order - right.order ||
        ordinalCompare(left.text, right.text)
      )
      .map((insertion) => insertion.text)
      .join("");
    merged = `${merged.slice(0, offset)}${text}${merged.slice(offset)}`;
  }
  return merged;
}

function removeRanges(source, ranges) {
  const mergedRanges = [];
  for (const range of ranges.sort((left, right) => left.start - right.start || left.end - right.end)) {
    const previous = mergedRanges[mergedRanges.length - 1];
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      mergedRanges.push({ ...range });
    }
  }

  let result = "";
  let cursor = 0;
  for (const range of mergedRanges) {
    result += source.slice(cursor, range.start);
    cursor = range.end;
  }
  return result + source.slice(cursor);
}

function changedDeclarationsForClassification(classification) {
  if (classification.side === "left") return classification.leftDeclarations;
  if (classification.side === "right") return classification.rightDeclarations;
  return uniqueDeclarations([
    ...classification.leftDeclarations,
    ...classification.rightDeclarations
  ]);
}

function conflictSides(conflict) {
  return [
    ...declarationSideRecords("base", conflict.baseDeclarations),
    ...declarationSideRecords("left", conflict.leftDeclarations),
    ...declarationSideRecords("right", conflict.rightDeclarations)
  ];
}

function declarationSideRecords(side, declarations) {
  return declarations.map((declaration) => ({
    side,
    recordId: declaration.id,
    sourceSpan: declaration.span,
    contentHash: declaration.contentHash,
    conflictKeys: declaration.conflictKeys,
    payload: {
      declarationKind: declaration.declarationKind,
      name: declaration.name,
      names: declaration.names,
      defaultExport: declaration.defaultExport,
      identityKey: declaration.identityKey
    }
  }));
}

function uniqueDeclarations(declarations) {
  const seen = new Set();
  const result = [];
  for (const declaration of declarations) {
    const key = declarationInstanceKey("any", declaration);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(declaration);
    }
  }
  return result;
}

function uniqueConflicts(conflicts) {
  const seen = new Set();
  const result = [];
  for (const conflict of conflicts) {
    if (!seen.has(conflict.id)) {
      seen.add(conflict.id);
      result.push(conflict);
    }
  }
  return result.sort((left, right) => ordinalCompare(left.id, right.id));
}

function declarationInstanceKey(side, declaration) {
  const span = declaration.span ?? {};
  return [
    side,
    declaration.identityKey,
    declaration.contentHash,
    span.start ?? "",
    span.end ?? "",
    declaration.id
  ].join(":");
}

function conflictId(code, side, key) {
  return ["js-ts-safe-merge-conflict", code, side, key]
    .map((part) => String(part ?? "unknown").replace(/\s+/g, " ").replace(/:/g, "%3A"))
    .join(":");
}

function sideOrder(side) {
  return side === "left" ? 0 : side === "right" ? 1 : 2;
}
