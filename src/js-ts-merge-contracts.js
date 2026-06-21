export const JS_TS_MERGE_CONTRACT_LANGUAGES = Object.freeze([
  "javascript",
  "typescript"
]);

export const JS_TS_MERGE_CONFLICT_REASON_CODES = Object.freeze([
  "js-ts.stale-source",
  "js-ts.dynamic-import",
  "js-ts.duplicate-declaration",
  "js-ts.duplicate-member",
  "js-ts.computed-member",
  "js-ts.missing-span",
  "js-ts.custom"
]);

export const JS_TS_MERGE_CONFLICT_SEVERITIES = Object.freeze([
  "info",
  "warning",
  "error"
]);

const JS_TS_MERGE_CONFLICT_DEFAULT_SEVERITY = Object.freeze({
  "js-ts.stale-source": "error",
  "js-ts.dynamic-import": "warning",
  "js-ts.duplicate-declaration": "error",
  "js-ts.duplicate-member": "error",
  "js-ts.computed-member": "warning",
  "js-ts.missing-span": "warning",
  "js-ts.custom": "warning"
});

export function createJsTsMergeImportRecord(input = {}) {
  const specifiers = input.specifiers ?? [];
  const attributes = input.attributes ?? [];
  const sourceSpans = sourceSpanList(input.sourceSpans, input.sourceSpan);
  const semanticNodeIds = uniqueStrings(input.semanticNodeIds, input.semanticNodeId);
  const semanticSymbolIds = uniqueStrings(input.semanticSymbolIds, input.semanticSymbolId);
  const nativeAstNodeIds = uniqueStrings(input.nativeAstNodeIds, input.nativeAstNodeId);
  const triviaIds = uniqueStrings(input.triviaIds, input.leadingTriviaIds, input.trailingTriviaIds);
  const record = {
    ...input,
    id: input.id ?? jsTsImportId(input),
    importKind: input.importKind ?? "value",
    specifiers,
    attributes,
    sourceSpans,
    semanticNodeIds,
    semanticSymbolIds,
    nativeAstNodeIds,
    triviaIds
  };
  return {
    ...record,
    kind: "frontier.lang.jsTsMergeImport",
    version: 1,
    conflictKeys: input.conflictKeys ?? uniqueStrings(defaultJsTsImportConflictKey(record)),
    metadata: input.metadata ?? {}
  };
}

export function createJsTsTopLevelDeclarationRecord(input = {}) {
  const sourceSpans = sourceSpanList(input.sourceSpans, input.sourceSpan);
  const memberIds = uniqueStrings(input.memberIds, input.memberId, ...(input.members ?? []).map((member) => member?.id));
  const semanticNodeIds = uniqueStrings(input.semanticNodeIds, input.semanticNodeId);
  const semanticSymbolIds = uniqueStrings(input.semanticSymbolIds, input.semanticSymbolId);
  const nativeAstNodeIds = uniqueStrings(input.nativeAstNodeIds, input.nativeAstNodeId);
  const triviaIds = uniqueStrings(input.triviaIds, input.leadingTriviaIds, input.trailingTriviaIds);
  const modifiers = uniqueStrings(input.modifiers, input.modifier);
  const record = {
    ...input,
    id: input.id ?? jsTsDeclarationId(input),
    declarationKind: input.declarationKind ?? "declaration",
    exported: Boolean(input.exported),
    defaultExport: Boolean(input.defaultExport),
    ambient: Boolean(input.ambient),
    modifiers,
    sourceSpans,
    memberIds,
    semanticNodeIds,
    semanticSymbolIds,
    nativeAstNodeIds,
    triviaIds
  };
  return {
    ...record,
    kind: "frontier.lang.jsTsMergeTopLevelDeclaration",
    version: 1,
    conflictKeys: input.conflictKeys ?? uniqueStrings(defaultJsTsDeclarationConflictKey(record)),
    metadata: input.metadata ?? {}
  };
}

export function createJsTsMemberRecord(input = {}) {
  const sourceSpans = sourceSpanList(input.sourceSpans, input.sourceSpan);
  const semanticNodeIds = uniqueStrings(input.semanticNodeIds, input.semanticNodeId);
  const semanticSymbolIds = uniqueStrings(input.semanticSymbolIds, input.semanticSymbolId);
  const nativeAstNodeIds = uniqueStrings(input.nativeAstNodeIds, input.nativeAstNodeId);
  const triviaIds = uniqueStrings(input.triviaIds, input.leadingTriviaIds, input.trailingTriviaIds);
  const modifiers = uniqueStrings(input.modifiers, input.modifier);
  const record = {
    ...input,
    id: input.id ?? jsTsMemberId(input),
    memberKind: input.memberKind ?? "member",
    static: Boolean(input.static),
    optional: Boolean(input.optional),
    computed: Boolean(input.computed),
    modifiers,
    sourceSpans,
    semanticNodeIds,
    semanticSymbolIds,
    nativeAstNodeIds,
    triviaIds
  };
  return {
    ...record,
    kind: "frontier.lang.jsTsMergeMember",
    version: 1,
    conflictKeys: input.conflictKeys ?? uniqueStrings(defaultJsTsMemberConflictKey(record)),
    metadata: input.metadata ?? {}
  };
}

export function createJsTsTriviaRecord(input = {}) {
  const sourceSpan = input.sourceSpan ?? input.span;
  const sourceSpans = sourceSpanList(input.sourceSpans, sourceSpan);
  const record = {
    ...input,
    id: input.id ?? jsTsTriviaId({ ...input, sourceSpan }),
    triviaKind: input.triviaKind ?? "comment",
    placement: input.placement ?? "detached",
    sourceSpan,
    sourceSpans,
    attachedToId: input.attachedToId,
    textHash: input.textHash
  };
  return {
    ...record,
    kind: "frontier.lang.jsTsMergeTrivia",
    version: 1,
    conflictKeys: input.conflictKeys ?? uniqueStrings(defaultJsTsTriviaConflictKey(record)),
    metadata: input.metadata ?? {}
  };
}

export function createJsTsConflictSidecarRecord(input = {}) {
  const sides = (input.sides ?? []).map((side, index) => normalizeJsTsConflictSide(side, index));
  const code = normalizeJsTsConflictReasonCode(input.code ?? input.reasonCode ?? inferJsTsConflictReasonCode(input));
  const severity = normalizeJsTsConflictSeverity(input.severity, code);
  const affectedSpans = uniqueSourceSpans(
    input.affectedSpans,
    input.sourceSpans,
    input.sourceSpan,
    sides.flatMap((side) => side.sourceSpans ?? [])
  );
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const remediationHints = normalizeJsTsRemediationHints(
    input.remediationHints ?? defaultJsTsRemediationHints({ code, targetKind: input.targetKind, targetId: input.targetId, sides })
  );
  const record = {
    ...input,
    id: input.id ?? jsTsConflictSidecarId(input),
    code,
    reasonCode: code,
    severity,
    conflictKind: input.conflictKind ?? "custom",
    targetKind: input.targetKind ?? "contract",
    sides,
    affectedSpans,
    sourceSpans: affectedSpans,
    evidenceIds
  };
  return {
    ...record,
    kind: "frontier.lang.jsTsMergeConflictSidecar",
    version: 1,
    conflictKeys: input.conflictKeys ?? uniqueStrings(
      defaultJsTsConflictSidecarKey(record),
      sides.flatMap((side) => side?.conflictKeys ?? [])
    ),
    remediationHints,
    metadata: input.metadata ?? {}
  };
}

export function createJsTsMergeContractRecord(input = {}) {
  const imports = (input.imports ?? []).map((record) => createJsTsMergeImportRecord(record));
  const topLevelDeclarations = (input.topLevelDeclarations ?? input.declarations ?? [])
    .map((record) => createJsTsTopLevelDeclarationRecord(record));
  const members = (input.members ?? []).map((record) => createJsTsMemberRecord(record));
  const trivia = (input.trivia ?? []).map((record) => createJsTsTriviaRecord(record));
  const conflictSidecars = (input.conflictSidecars ?? input.conflicts ?? [])
    .map((record) => createJsTsConflictSidecarRecord(record));
  const sourceSpans = sourceSpanList(input.sourceSpans, input.sourceSpan);
  const evidenceIds = uniqueStrings(input.evidenceIds, input.evidenceId);
  const childConflictKeys = [
    ...imports,
    ...topLevelDeclarations,
    ...members,
    ...trivia,
    ...conflictSidecars
  ].flatMap((record) => record.conflictKeys);

  return {
    ...input,
    kind: "frontier.lang.jsTsMergeContract",
    version: 1,
    id: input.id ?? `js-ts-merge-contract:${input.sourcePath ?? input.sourceHash ?? "source"}`,
    language: input.language ?? "typescript",
    sourceSpans,
    imports,
    topLevelDeclarations,
    members,
    trivia,
    conflictSidecars,
    evidenceIds,
    conflictKeys: input.conflictKeys ?? uniqueStrings(childConflictKeys),
    metadata: input.metadata ?? {}
  };
}

export function jsTsMergeContractConflictKeys(contract) {
  return uniqueStrings(
    contract?.conflictKeys,
    contract?.imports?.flatMap((record) => record.conflictKeys),
    contract?.topLevelDeclarations?.flatMap((record) => record.conflictKeys),
    contract?.members?.flatMap((record) => record.conflictKeys),
    contract?.trivia?.flatMap((record) => record.conflictKeys),
    contract?.conflictSidecars?.flatMap((record) => record.conflictKeys)
  );
}

function jsTsImportId(input) {
  return `js-ts-import:${conflictKeyPart(input.moduleSpecifier ?? "side-effect")}:${conflictKeyPart(input.importKind ?? "value")}`;
}

function jsTsDeclarationId(input) {
  return `js-ts-declaration:${conflictKeyPart(input.name ?? input.semanticNodeId ?? input.nativeAstNodeId ?? input.declarationKind ?? "anonymous")}`;
}

function jsTsMemberId(input) {
  return [
    "js-ts-member",
    input.ownerDeclarationId ?? input.ownerId ?? "owner",
    input.name ?? input.semanticNodeId ?? input.nativeAstNodeId ?? input.memberKind ?? "anonymous"
  ].map(conflictKeyPart).join(":");
}

function jsTsTriviaId(input) {
  return [
    "js-ts-trivia",
    input.attachedToId ?? "detached",
    input.placement ?? "detached",
    spanKey(input.sourceSpan)
  ].map(conflictKeyPart).join(":");
}

function jsTsConflictSidecarId(input) {
  return [
    "js-ts-conflict",
    input.conflictKind ?? "custom",
    input.targetKind ?? "contract",
    input.targetId ?? "unknown"
  ].map(conflictKeyPart).join(":");
}

function defaultJsTsImportConflictKey(record) {
  return [
    "js-ts",
    "import",
    record.moduleSpecifier ?? "side-effect",
    record.importKind,
    specifierSummary(record.specifiers)
  ].map(conflictKeyPart).join(":");
}

function defaultJsTsDeclarationConflictKey(record) {
  return [
    "js-ts",
    "declaration",
    record.declarationKind,
    record.name ?? record.semanticNodeIds?.[0] ?? record.nativeAstNodeIds?.[0] ?? record.id
  ].map(conflictKeyPart).join(":");
}

function defaultJsTsMemberConflictKey(record) {
  return [
    "js-ts",
    "member",
    record.ownerDeclarationId ?? record.ownerId ?? "owner",
    record.memberKind,
    record.name ?? record.semanticNodeIds?.[0] ?? record.nativeAstNodeIds?.[0] ?? record.id
  ].map(conflictKeyPart).join(":");
}

function defaultJsTsTriviaConflictKey(record) {
  return [
    "js-ts",
    "trivia",
    record.attachedToId ?? "detached",
    record.placement,
    record.triviaKind,
    spanKey(record.sourceSpan)
  ].map(conflictKeyPart).join(":");
}

function defaultJsTsConflictSidecarKey(record) {
  return [
    "js-ts",
    "conflict",
    record.conflictKind,
    record.targetKind,
    record.targetId ?? "unknown"
  ].map(conflictKeyPart).join(":");
}

function specifierSummary(specifiers) {
  const names = uniqueStrings((specifiers ?? []).map((specifier) => {
    if (typeof specifier === "string") return specifier;
    return specifier?.importedName ?? specifier?.localName ?? specifier?.exportedName ?? specifier?.name;
  }));
  return names.length > 0 ? names.join(",") : "side-effect";
}

function normalizeJsTsConflictSide(side = {}, index = 0) {
  const sourceSpans = sourceSpanList(side.sourceSpans, side.sourceSpan);
  return {
    ...side,
    side: normalizeJsTsConflictSideIdentity(side.side, index),
    sourceSpans,
    conflictKeys: uniqueStrings(side.conflictKeys),
    triviaIds: uniqueStrings(side.triviaIds, side.leadingTriviaIds, side.trailingTriviaIds),
    metadata: side.metadata ?? {}
  };
}

function normalizeJsTsConflictSideIdentity(side, index) {
  if (typeof side === "string" && side.length > 0) {
    return side;
  }
  return `side-${index + 1}`;
}

function inferJsTsConflictReasonCode(input) {
  const conflictKind = typeof input.conflictKind === "string" ? input.conflictKind : "";
  const targetKind = typeof input.targetKind === "string" ? input.targetKind : "";
  const kind = `${conflictKind}:${targetKind}`;
  if (input.staleSource === true || conflictKind === "stale-source" || input.metadata?.staleSource === true) {
    return "js-ts.stale-source";
  }
  if (input.dynamic === true || conflictKind === "dynamic-import" || kind === "import:dynamic" || input.metadata?.dynamic === true) {
    return "js-ts.dynamic-import";
  }
  if (conflictKind === "duplicate-declaration" || conflictKind === "same-name-declaration") {
    return "js-ts.duplicate-declaration";
  }
  if (conflictKind === "duplicate-member" || conflictKind === "same-name-member") {
    return "js-ts.duplicate-member";
  }
  if (input.computed === true || conflictKind === "computed-member" || input.metadata?.computed === true) {
    return "js-ts.computed-member";
  }
  if (conflictKind === "missing-span" || targetKind === "sourceSpan" || input.metadata?.missingSpan === true) {
    return "js-ts.missing-span";
  }
  return "js-ts.custom";
}

function normalizeJsTsConflictReasonCode(code) {
  return typeof code === "string" && code.length > 0 ? code : "js-ts.custom";
}

function normalizeJsTsConflictSeverity(severity, code) {
  if (JS_TS_MERGE_CONFLICT_SEVERITIES.includes(severity)) {
    return severity;
  }
  return JS_TS_MERGE_CONFLICT_DEFAULT_SEVERITY[code] ?? "warning";
}

function defaultJsTsRemediationHints(input) {
  const targetKind = input.targetKind ?? "contract";
  const targetIds = uniqueStrings(input.targetId, input.sides?.map((side) => side.recordId));
  if (input.code === "js-ts.stale-source") {
    return [{ action: "refresh-source", target: targetKind, targetIds }];
  }
  if (input.code === "js-ts.dynamic-import") {
    return [{ action: "manual-review", target: "import", targetIds }];
  }
  if (input.code === "js-ts.duplicate-declaration") {
    return [{ action: "rename-or-merge-declaration", target: "topLevelDeclaration", targetIds }];
  }
  if (input.code === "js-ts.duplicate-member") {
    return [{ action: "rename-or-merge-member", target: "member", targetIds }];
  }
  if (input.code === "js-ts.computed-member") {
    return [{ action: "manual-review", target: "member", targetIds }];
  }
  if (input.code === "js-ts.missing-span") {
    return [{ action: "add-source-span", target: targetKind, targetIds }];
  }
  return [{ action: "manual-review", target: targetKind, targetIds }];
}

function normalizeJsTsRemediationHints(hints) {
  return (hints ?? []).map((hint) => {
    if (typeof hint === "string") {
      return { action: hint, targetIds: [] };
    }
    const action = typeof hint?.action === "string" && hint.action.length > 0 ? hint.action : "manual-review";
    return {
      action,
      ...(typeof hint?.target === "string" ? { target: hint.target } : {}),
      targetIds: uniqueStrings(hint?.targetIds),
      ...(typeof hint?.detail === "string" ? { detail: hint.detail } : {}),
      ...(hint?.metadata && typeof hint.metadata === "object" ? { metadata: hint.metadata } : {})
    };
  }).sort((left, right) => remediationHintKey(left).localeCompare(remediationHintKey(right)));
}

function remediationHintKey(hint) {
  return [
    hint.action,
    hint.target ?? "",
    hint.targetIds.join("\u0000"),
    hint.detail ?? ""
  ].join("\u0001");
}

function sourceSpanList(sourceSpans, sourceSpan) {
  if (Array.isArray(sourceSpans)) {
    return sourceSpans;
  }
  return sourceSpan ? [sourceSpan] : [];
}

function uniqueSourceSpans(...values) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    collectSourceSpans(value, result, seen);
  }
  return result;
}

function collectSourceSpans(value, result, seen) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSourceSpans(item, result, seen);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  const key = spanKey(value);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  result.push(value);
}

function spanKey(span) {
  if (!span) return "unknown";
  return [
    span.path ?? span.sourceId ?? "source",
    span.startLine ?? span.start ?? "",
    span.startColumn ?? "",
    span.endLine ?? span.end ?? "",
    span.endColumn ?? ""
  ].map(conflictKeyPart).join(":");
}

function uniqueStrings(...values) {
  const result = [];
  for (const value of values) {
    collectStrings(value, result);
  }
  return result;
}

function collectStrings(value, result) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, result);
    }
    return;
  }
  if (typeof value !== "string" || value.length === 0 || result.includes(value)) {
    return;
  }
  result.push(value);
}

function conflictKeyPart(value) {
  if (value === undefined || value === null || value === "") return "unknown";
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ");
}
