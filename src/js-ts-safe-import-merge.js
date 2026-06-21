import { hashSemanticValue } from "./hashing.js";
import {
  createJsTsConflictSidecarRecord,
  createJsTsMergeContractRecord
} from "./js-ts-merge-contracts.js";
import { ordinalCompare, unique } from "./shared.js";

export const JS_TS_SAFE_IMPORT_MERGE_STATUSES = Object.freeze([
  "unchanged",
  "merged",
  "conflict"
]);

const STATIC_IMPORT_KINDS = new Set(["value", "type", "namespace", "side-effect"]);
const LINE_TERMINATOR_PATTERN = /\r\n|\n|\r/;

export function createJsTsSafeImportMerge(input = {}, options = {}) {
  return mergeJsTsSafeImports(input, options);
}

export function mergeJsTsSafeImports(input = {}, options = {}) {
  const normalized = normalizeSafeImportMergeInput(input, options);
  const analysis = analyzeImportChanges(normalized);
  const target = selectMergeTarget(normalized, analysis.additions);
  const conflicts = [...analysis.conflicts];
  let insertionPoint;

  if (conflicts.length === 0) {
    insertionPoint = resolveImportInsertionPoint(target.sourceText, target.contract, target.side);
    if (insertionPoint.conflict) {
      conflicts.push(insertionPoint.conflict);
    }
  }

  if (conflicts.length > 0) {
    return safeImportMergeRecord(normalized, {
      status: "conflict",
      target,
      mergedSource: target.sourceText,
      edits: [],
      appliedImports: [],
      conflictSidecars: conflicts,
      metadata: {
        targetSide: target.side,
        appliedImportCount: 0,
        conflictCount: conflicts.length
      }
    });
  }

  const additions = dedupeAdditions(analysis.additions);
  if (additions.length === 0) {
    return safeImportMergeRecord(normalized, {
      status: "unchanged",
      target,
      mergedSource: target.sourceText,
      edits: [],
      appliedImports: [],
      conflictSidecars: [],
      metadata: {
        targetSide: target.side,
        appliedImportCount: 0,
        conflictCount: 0
      }
    });
  }

  const insertText = formatImportInsertion(additions);
  const mergedSource = insertAt(target.sourceText, insertionPoint.offset, insertText);
  const edit = {
    kind: "frontier.lang.jsTsSafeImportEdit",
    version: 1,
    editKind: "insert",
    offset: insertionPoint.offset,
    side: target.side,
    text: insertText,
    importIds: additions.map((addition) => addition.record.id),
    conflictKeys: unique(additions.flatMap((addition) => addition.record.conflictKeys ?? [])).sort(ordinalCompare)
  };

  return safeImportMergeRecord(normalized, {
    status: "merged",
    target,
    mergedSource,
    edits: [edit],
    appliedImports: additions.map((addition) => appliedImportRecord(addition)),
    conflictSidecars: [],
    metadata: {
      targetSide: target.side,
      appliedImportCount: additions.length,
      conflictCount: 0
    }
  });
}

export function jsTsImportIdentityKey(record = {}, options = {}) {
  const sourcePath = options.sourcePath ?? record.sourcePath ?? record.sourceSpan?.path;
  return [
    "jsts-import",
    keyPart(sourcePath ?? "inline"),
    keyPart(record.importKind ?? "value"),
    keyPart(record.moduleSpecifier ?? "side-effect"),
    keyPart(specifierIdentitySummary(record.specifiers ?? [])),
    keyPart(attributeIdentitySummary(record.attributes ?? []))
  ].join(":");
}

function normalizeSafeImportMergeInput(input, options) {
  const sourcePath = options.sourcePath ?? input.sourcePath;
  const language = options.language ?? input.language ?? "typescript";
  const baseSource = String(input.baseSource ?? input.base ?? "");
  const leftSource = String(input.leftSource ?? input.left ?? "");
  const rightSource = String(input.rightSource ?? input.right ?? "");
  const targetSource = input.targetSource ?? input.sourceText;
  return {
    id: options.id ?? input.id ?? "jsts-safe-import-merge",
    sourcePath,
    language,
    baseSource,
    leftSource,
    rightSource,
    targetSource: typeof targetSource === "string" ? targetSource : undefined,
    targetSide: options.targetSide ?? input.targetSide,
    baseContract: normalizeContract(input.baseContract, { language, sourcePath }),
    leftContract: normalizeContract(input.leftContract, { language, sourcePath }),
    rightContract: normalizeContract(input.rightContract, { language, sourcePath }),
    targetContract: input.targetContract
      ? normalizeContract(input.targetContract, { language, sourcePath })
      : undefined,
    metadata: {
      ...(input.metadata ?? {}),
      ...(options.metadata ?? {})
    }
  };
}

function normalizeContract(contract, defaults) {
  return createJsTsMergeContractRecord({
    language: defaults.language,
    sourcePath: defaults.sourcePath,
    ...(contract ?? {})
  });
}

function analyzeImportChanges(normalized) {
  const baseImports = normalized.baseContract.imports ?? [];
  const baseByIdentity = groupBy(baseImports, (record) => jsTsImportIdentityKey(record, normalized));
  const baseModules = new Set(baseImports.map((record) => importModuleKey(record, normalized)));
  const left = collectSideChanges("left", normalized.leftContract.imports ?? [], {
    sourceText: normalized.leftSource,
    baseImports,
    baseByIdentity,
    baseModules,
    normalized
  });
  const right = collectSideChanges("right", normalized.rightContract.imports ?? [], {
    sourceText: normalized.rightSource,
    baseImports,
    baseByIdentity,
    baseModules,
    normalized
  });
  const crossSide = collectCrossSideConflicts([...left.additions, ...right.additions], normalized);
  const rejectedAdditionKeys = new Set(crossSide.rejectedAdditionKeys);
  return {
    additions: [...left.additions, ...right.additions].filter((addition) => !rejectedAdditionKeys.has(addition.additionKey)),
    conflicts: [...left.conflicts, ...right.conflicts, ...crossSide.conflicts]
  };
}

function collectSideChanges(side, imports, context) {
  const sideByIdentity = groupBy(imports, (record) => jsTsImportIdentityKey(record, context.normalized));
  const additions = [];
  const conflicts = [];

  for (const baseImport of context.baseImports) {
    const identityKey = jsTsImportIdentityKey(baseImport, context.normalized);
    if (sideByIdentity.has(identityKey)) {
      continue;
    }
    conflicts.push(createImportConflict({
      code: "import-delete",
      message: "Existing import records are not removed by the safe import merge helper.",
      side,
      records: [baseImport],
      normalized: context.normalized
    }));
  }

  for (const record of imports) {
    const identityKey = jsTsImportIdentityKey(record, context.normalized);
    if (context.baseByIdentity.has(identityKey)) {
      continue;
    }

    const staticCheck = classifyStaticImportRecord(record);
    if (!staticCheck.ok) {
      conflicts.push(createImportConflict({
        code: staticCheck.code,
        message: staticCheck.message,
        side,
        records: [record],
        normalized: context.normalized
      }));
      continue;
    }

    const moduleKey = importModuleKey(record, context.normalized);
    if (context.baseModules.has(moduleKey)) {
      conflicts.push(createImportConflict({
        code: "same-module-incompatible-rewrite",
        message: "The helper does not rewrite or extend an existing module import.",
        side,
        records: [record],
        normalized: context.normalized
      }));
      continue;
    }

    const span = readStaticImportSpan(record, context.sourceText);
    if (!span.ok) {
      conflicts.push(createImportConflict({
        code: span.code,
        message: span.message,
        side,
        records: [record],
        normalized: context.normalized,
        span
      }));
      continue;
    }

    additions.push({
      side,
      record,
      identityKey,
      moduleKey,
      additionKey: `${side}:${identityKey}`,
      start: span.start,
      end: span.end,
      text: span.text
    });
  }

  return { additions, conflicts };
}

function collectCrossSideConflicts(additions, normalized) {
  const conflicts = [];
  const rejectedAdditionKeys = [];
  const byModule = groupBy(additions, (addition) => addition.moduleKey);

  for (const sameModuleAdditions of byModule.values()) {
    const sides = unique(sameModuleAdditions.map((addition) => addition.side));
    const identities = unique(sameModuleAdditions.map((addition) => addition.identityKey));
    if (sides.length < 2 || identities.length < 2) {
      continue;
    }
    rejectedAdditionKeys.push(...sameModuleAdditions.map((addition) => addition.additionKey));
    conflicts.push(createImportConflict({
      code: "same-module-incompatible-rewrite",
      message: "Both sides added incompatible imports for the same module.",
      side: "both",
      records: sameModuleAdditions.map((addition) => addition.record),
      normalized
    }));
  }

  return { conflicts, rejectedAdditionKeys };
}

function selectMergeTarget(normalized, additions) {
  if (normalized.targetSource !== undefined) {
    return {
      side: normalized.targetSide ?? "target",
      sourceText: normalized.targetSource,
      contract: normalized.targetContract ?? emptyContract(normalized)
    };
  }

  const sides = unique(additions.map((addition) => addition.side));
  if (sides.length === 1 && sides[0] === "left") {
    return { side: "right", sourceText: normalized.rightSource, contract: normalized.rightContract };
  }
  if (sides.length === 1 && sides[0] === "right") {
    return { side: "left", sourceText: normalized.leftSource, contract: normalized.leftContract };
  }
  return { side: "base", sourceText: normalized.baseSource, contract: normalized.baseContract };
}

function emptyContract(normalized) {
  return createJsTsMergeContractRecord({
    language: normalized.language,
    sourcePath: normalized.sourcePath
  });
}

function resolveImportInsertionPoint(sourceText, contract, side) {
  let offset;
  for (const record of contract.imports ?? []) {
    if (!classifyStaticImportRecord(record).ok) {
      continue;
    }
    const span = readStaticImportSpan(record, sourceText);
    if (!span.ok) {
      return {
        conflict: createImportConflict({
          code: "target-span-stale",
          message: "The target import span could not be verified before inserting a safe import.",
          side,
          records: [record],
          normalized: {
            sourcePath: contract.sourcePath,
            language: contract.language
          },
          span
        })
      };
    }
    offset = Math.max(offset ?? 0, span.end);
  }
  return { offset: offset ?? defaultImportInsertionOffset(sourceText) };
}

function classifyStaticImportRecord(record) {
  const importKind = String(record.importKind ?? "value");
  if (importKind === "dynamic" || record.metadata?.dynamic === true) {
    return {
      ok: false,
      code: "dynamic-import",
      message: "Dynamic imports require a structured conflict instead of an edit."
    };
  }
  if (!STATIC_IMPORT_KINDS.has(importKind)) {
    return {
      ok: false,
      code: "non-static-import",
      message: `Import kind ${importKind} is outside the static import subset.`
    };
  }
  if (typeof record.moduleSpecifier !== "string" || record.moduleSpecifier.length === 0) {
    return {
      ok: false,
      code: "stale-span",
      message: "Static import records must include a module specifier."
    };
  }
  return { ok: true };
}

function readStaticImportSpan(record, sourceText) {
  const offsets = sourceSpanOffsets(record.sourceSpan ?? record.sourceSpans?.[0], sourceText);
  if (!offsets.ok) {
    return offsets;
  }
  const text = sourceText.slice(offsets.start, offsets.end);
  const parsed = parseStaticImportSpecifier(text);
  if (!parsed.ok) {
    return parsed;
  }
  if (record.moduleSpecifier && parsed.moduleSpecifier !== record.moduleSpecifier) {
    return {
      ok: false,
      code: "stale-span",
      message: `Import span resolves to ${parsed.moduleSpecifier}, not ${record.moduleSpecifier}.`
    };
  }
  return {
    ok: true,
    start: offsets.start,
    end: offsets.end,
    text,
    moduleSpecifier: parsed.moduleSpecifier
  };
}

function sourceSpanOffsets(span, sourceText) {
  if (!span) {
    return {
      ok: false,
      code: "stale-span",
      message: "Import record is missing a source span."
    };
  }
  if (typeof span.start === "number" && typeof span.end === "number") {
    if (span.start < 0 || span.end > sourceText.length || span.end <= span.start) {
      return {
        ok: false,
        code: "stale-span",
        message: "Import source span is outside the source text."
      };
    }
    return { ok: true, start: span.start, end: span.end };
  }
  if (
    typeof span.startLine === "number" &&
    typeof span.startColumn === "number" &&
    typeof span.endLine === "number" &&
    typeof span.endColumn === "number"
  ) {
    const lineStarts = collectLineStarts(sourceText);
    const start = offsetAt(lineStarts, span.startLine, span.startColumn);
    const end = offsetAt(lineStarts, span.endLine, span.endColumn);
    if (start === undefined || end === undefined || end <= start) {
      return {
        ok: false,
        code: "stale-span",
        message: "Import line/column span could not be resolved in the source text."
      };
    }
    return { ok: true, start, end };
  }
  return {
    ok: false,
    code: "stale-span",
    message: "Import source span needs either offsets or line/column positions."
  };
}

function parseStaticImportSpecifier(text) {
  const source = stripLeadingTrivia(text).trimStart();
  if (!/^import\b/.test(source)) {
    return {
      ok: false,
      code: "stale-span",
      message: "Import span does not start with a static import declaration."
    };
  }
  if (/^import\s*\(/.test(source)) {
    return {
      ok: false,
      code: "dynamic-import",
      message: "Import span points at a dynamic import expression."
    };
  }

  const fromMatch = /\bfrom\s*(['"])([^'"]+)\1/.exec(source);
  if (fromMatch) {
    return { ok: true, moduleSpecifier: fromMatch[2] };
  }

  const sideEffectMatch = /^import\s*(['"])([^'"]+)\1/.exec(source);
  if (sideEffectMatch) {
    return { ok: true, moduleSpecifier: sideEffectMatch[2] };
  }

  return {
    ok: false,
    code: "stale-span",
    message: "Import span does not contain a quoted static module specifier."
  };
}

function defaultImportInsertionOffset(sourceText) {
  let offset = 0;
  if (sourceText.startsWith("#!")) {
    offset = scanLine(sourceText, 0);
  }

  while (offset < sourceText.length) {
    const start = offset;
    offset = scanWhitespace(sourceText, offset);
    if (sourceText.startsWith("//", offset)) {
      offset = scanLine(sourceText, offset);
      continue;
    }
    if (sourceText.startsWith("/*", offset)) {
      const end = sourceText.indexOf("*/", offset + 2);
      if (end < 0) {
        return offset;
      }
      offset = end + 2;
      continue;
    }
    if (offset === start) {
      break;
    }
  }
  return offset;
}

function stripLeadingTrivia(text) {
  let offset = 0;
  while (offset < text.length) {
    const next = scanWhitespace(text, offset);
    if (next !== offset) {
      offset = next;
      continue;
    }
    if (text.startsWith("//", offset)) {
      offset = scanLine(text, offset);
      continue;
    }
    if (text.startsWith("/*", offset)) {
      const end = text.indexOf("*/", offset + 2);
      if (end < 0) {
        return text.slice(offset);
      }
      offset = end + 2;
      continue;
    }
    break;
  }
  return text.slice(offset);
}

function scanWhitespace(sourceText, offset) {
  while (offset < sourceText.length && /\s/.test(sourceText[offset])) {
    offset += 1;
  }
  return offset;
}

function scanLine(sourceText, offset) {
  const match = LINE_TERMINATOR_PATTERN.exec(sourceText.slice(offset));
  if (!match) {
    return sourceText.length;
  }
  return offset + match.index + match[0].length;
}

function collectLineStarts(sourceText) {
  const starts = [0];
  for (let index = 0; index < sourceText.length; index += 1) {
    if (sourceText[index] === "\r") {
      if (sourceText[index + 1] === "\n") {
        starts.push(index + 2);
        index += 1;
      } else {
        starts.push(index + 1);
      }
      continue;
    }
    if (sourceText[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

function offsetAt(lineStarts, line, column) {
  const lineStart = lineStarts[line - 1];
  if (lineStart === undefined || column < 1) {
    return undefined;
  }
  const offset = lineStart + column - 1;
  return offset;
}

function formatImportInsertion(additions) {
  return additions
    .map((addition) => addition.text.trim())
    .filter(Boolean)
    .map((text) => text.endsWith("\n") ? text : `${text}\n`)
    .join("");
}

function insertAt(sourceText, offset, insertText) {
  const before = sourceText.slice(0, offset);
  const after = sourceText.slice(offset);
  let text = insertText;
  if (before.length > 0 && !before.endsWith("\n") && !text.startsWith("\n")) {
    text = `\n${text}`;
  }
  if (after.length > 0 && !after.startsWith("\n") && !text.endsWith("\n")) {
    text = `${text}\n`;
  }
  return `${before}${text}${after}`;
}

function dedupeAdditions(additions) {
  const seen = new Set();
  return [...additions]
    .sort((left, right) =>
      left.side.localeCompare(right.side) ||
      left.start - right.start ||
      ordinalCompare(left.identityKey, right.identityKey)
    )
    .filter((addition) => {
      if (seen.has(addition.identityKey)) {
        return false;
      }
      seen.add(addition.identityKey);
      return true;
    });
}

function appliedImportRecord(addition) {
  return {
    side: addition.side,
    recordId: addition.record.id,
    identityKey: addition.identityKey,
    moduleKey: addition.moduleKey,
    moduleSpecifier: addition.record.moduleSpecifier,
    sourceSpan: addition.record.sourceSpan ?? addition.record.sourceSpans?.[0],
    conflictKeys: addition.record.conflictKeys ?? []
  };
}

function safeImportMergeRecord(normalized, result) {
  const conflictKeys = unique([
    ...result.appliedImports.flatMap((record) => record.conflictKeys ?? []),
    ...result.conflictSidecars.flatMap((record) => record.conflictKeys ?? [])
  ]).sort(ordinalCompare);

  return {
    kind: "frontier.lang.jsTsSafeImportMerge",
    version: 1,
    id: normalized.id,
    status: result.status,
    autoMergeable: result.status !== "conflict",
    sourcePath: normalized.sourcePath,
    language: normalized.language,
    targetSide: result.target.side,
    sourceText: result.target.sourceText,
    mergedSource: result.mergedSource,
    edits: result.edits,
    appliedImports: result.appliedImports,
    conflictSidecars: result.conflictSidecars,
    conflicts: result.conflictSidecars,
    conflictKeys,
    metadata: {
      ...(normalized.metadata ?? {}),
      ...result.metadata
    }
  };
}

function createImportConflict(input) {
  const records = input.records ?? [];
  const targetId = records.map((record) => record.id).filter(Boolean).join("+") || input.code;
  return createJsTsConflictSidecarRecord({
    id: `jsts-safe-import-conflict:${input.code}:${keyPart(targetId)}`,
    conflictKind: "import",
    targetKind: "import",
    targetId,
    conflictKeys: unique(records.flatMap((record) => record.conflictKeys ?? [])).sort(ordinalCompare),
    sides: records.map((record) => ({
      side: input.side,
      recordId: record.id,
      sourceSpan: record.sourceSpan ?? record.sourceSpans?.[0],
      contentHash: hashSemanticValue(importConflictPayload(record, input)),
      conflictKeys: record.conflictKeys ?? [],
      payload: importConflictPayload(record, input)
    })),
    metadata: {
      code: input.code,
      message: input.message,
      side: input.side,
      sourcePath: input.normalized?.sourcePath,
      language: input.normalized?.language
    }
  });
}

function importConflictPayload(record, input) {
  return definedObject({
    code: input.code,
    importKind: record.importKind,
    moduleSpecifier: record.moduleSpecifier,
    identityKey: jsTsImportIdentityKey(record, input.normalized),
    spanMessage: input.span?.message
  });
}

function importModuleKey(record, options) {
  return [
    "jsts-import-module",
    keyPart(options.sourcePath ?? record.sourceSpan?.path ?? "inline"),
    keyPart(record.moduleSpecifier ?? "side-effect")
  ].join(":");
}

function specifierIdentitySummary(specifiers) {
  const parts = specifiers.map((specifier) => [
    specifier.kind ?? "named",
    specifier.importedName ?? specifier.name ?? "",
    specifier.localName ?? "",
    specifier.exportedName ?? ""
  ].map(keyPart).join("/"));
  return parts.length > 0 ? parts.sort(ordinalCompare).join(",") : "side-effect";
}

function attributeIdentitySummary(attributes) {
  const parts = attributes.map((attribute) => [
    attribute.key ?? "",
    attribute.value ?? ""
  ].map(keyPart).join("="));
  return parts.length > 0 ? parts.sort(ordinalCompare).join(",") : "none";
}

function groupBy(records, keyFn) {
  const map = new Map();
  for (const record of records) {
    const key = keyFn(record);
    const entries = map.get(key) ?? [];
    entries.push(record);
    map.set(key, entries);
  }
  return map;
}

function definedObject(input) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

function keyPart(value) {
  if (value === undefined || value === null || value === "") {
    return "unknown";
  }
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ");
}
