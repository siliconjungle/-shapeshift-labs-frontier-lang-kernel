import { hashSemanticValue } from "./hashing.js";
import { duplicateValues, ordinalCompare, unique, validateSourceSpan } from "./shared.js";

export const SourceTriviaSpanKinds = Object.freeze([
  "code",
  "whitespace",
  "lineComment",
  "blockComment",
  "string",
  "template"
]);

export const SourceTriviaDeclarationKeywords = Object.freeze([
  "import",
  "export",
  "function",
  "class",
  "interface",
  "type",
  "enum",
  "const",
  "let",
  "var",
  "namespace",
  "module",
  "declare"
]);

const TriviaKinds = new Set(["whitespace", "lineComment", "blockComment"]);
const BoundaryKinds = new Set(["lineComment", "blockComment", "string", "template"]);
const DeclarationKeywords = new Set(SourceTriviaDeclarationKeywords);
const DeclarationBodyKeywords = new Set([
  "function",
  "class",
  "interface",
  "type",
  "enum",
  "const",
  "let",
  "var",
  "namespace",
  "module"
]);
const DeclarationPrefixKeywords = new Set(["export", "declare", "default", "abstract", "async"]);
const MemberDeclarationKeywords = new Set(["class", "interface", "type", "const", "let", "var"]);
const SourceTriviaMemberKinds = new Set(["class", "interface", "type", "object"]);

export function createSourceTriviaLedger(input) {
  const sourceText = String(input.sourceText ?? "");
  const lineStarts = computeLineStarts(sourceText);
  const sourceHash = input.sourceHash ?? hashSemanticValue(sourceText);
  const sourceIdentity = sourceLedgerIdentity(input);
  const sourceBoundary = createSourceBoundaryRecord(sourceText, lineStarts, input);
  const spans = scanSourceSpans(sourceText, lineStarts, input);
  const triviaSpans = spans.filter((span) => TriviaKinds.has(span.kind));
  const imports = collectSourceImports(sourceText, lineStarts, spans, input);
  const declarations = collectSourceDeclarations(sourceText, lineStarts, spans, input, imports);
  const members = collectSourceMembers(sourceText, lineStarts, spans, input, declarations);
  const conflictKeys = collectSourceTriviaConflictKeys({
    sourceBoundary,
    spans,
    imports,
    declarations,
    members
  });

  return {
    kind: "frontier.lang.sourceTriviaLedger",
    version: 1,
    id: input.id ?? `source-trivia-ledger:${keyPart(sourceIdentity)}:${sourceHash}`,
    sourceId: input.sourceId,
    sourcePath: input.sourcePath ?? input.path,
    language: input.language ?? "javascript",
    sourceHash,
    sourceLength: sourceText.length,
    lineCount: lineStarts.length,
    sourceSpan: sourceBoundary.span,
    sourceBoundary,
    spans,
    triviaSpans,
    imports,
    declarations,
    members,
    conflictKeys,
    metadata: input.metadata
  };
}

export function collectSourceTriviaConflictKeys(input, options = {}) {
  const includeSourceBoundary = options.includeSourceBoundary ?? true;
  const includeSourceSpans = options.includeSourceSpans ?? true;
  const includeImports = options.includeImports ?? true;
  const includeDeclarations = options.includeDeclarations ?? true;
  const includeMembers = options.includeMembers ?? true;
  return unique([
    ...(includeSourceBoundary ? [input.sourceBoundary?.conflictKey] : []),
    ...(includeSourceSpans ? (input.spans ?? []).map((span) => span.conflictKey) : []),
    ...(includeImports ? (input.imports ?? []).map((record) => record.conflictKey) : []),
    ...(includeDeclarations ? (input.declarations ?? []).map((declaration) => declaration.conflictKey) : []),
    ...(includeMembers ? (input.members ?? []).map((member) => member.conflictKey) : [])
  ].filter(Boolean)).sort(ordinalCompare);
}

export function validateSourceTriviaLedgerRecord(ledger) {
  const issues = [];
  const ledgerId = ledger.id ?? "(unknown)";
  if (ledger.kind !== "frontier.lang.sourceTriviaLedger") {
    issues.push(`Source trivia ledger ${ledgerId} has invalid kind`);
  }
  if (ledger.version !== 1) {
    issues.push(`Source trivia ledger ${ledgerId} has unsupported version ${ledger.version}`);
  }
  if (!ledger.id) {
    issues.push("Source trivia ledger is missing id");
  }
  if (typeof ledger.sourceLength !== "number" || ledger.sourceLength < 0) {
    issues.push(`Source trivia ledger ${ledgerId} has invalid source length ${ledger.sourceLength}`);
  }
  const sourceLength = typeof ledger.sourceLength === "number" ? ledger.sourceLength : undefined;

  const allConflictRecords = [];
  if (!ledger.sourceBoundary) {
    issues.push(`Source trivia ledger ${ledgerId} is missing source boundary`);
  } else {
    validateRangeRecord(ledger.sourceBoundary, `Source trivia ledger ${ledgerId} source boundary`, issues, sourceLength);
    allConflictRecords.push(ledger.sourceBoundary);
    if (ledger.sourceBoundary.kind !== "source") {
      issues.push(`Source trivia ledger ${ledgerId} source boundary has unsupported kind ${ledger.sourceBoundary.kind}`);
    }
    if (ledger.sourceBoundary.span?.start !== 0 || ledger.sourceBoundary.span?.end !== sourceLength) {
      issues.push(`Source trivia ledger ${ledgerId} source boundary must cover offsets 0..${sourceLength}`);
    }
  }
  if (ledger.sourceSpan) {
    validateConcreteSourceSpan(ledger.sourceSpan, `Source trivia ledger ${ledgerId} source span`, issues, sourceLength);
    if (ledger.sourceSpan.start !== 0 || ledger.sourceSpan.end !== sourceLength) {
      issues.push(`Source trivia ledger ${ledgerId} source span must cover offsets 0..${sourceLength}`);
    }
  }

  const spans = ledger.spans ?? [];
  const spanIds = new Set();
  const spanIdDuplicates = duplicateValues(spans.map((span) => span.id));
  for (const duplicate of spanIdDuplicates) {
    issues.push(`Source trivia ledger ${ledgerId} has duplicate span id ${duplicate}`);
  }
  const spanConflictDuplicates = duplicateValues(spans.map((span) => span.conflictKey));
  for (const duplicate of spanConflictDuplicates) {
    issues.push(`Source trivia ledger ${ledgerId} has duplicate span conflict key ${duplicate}`);
  }

  let previousEnd = 0;
  for (const [index, span] of spans.entries()) {
    const label = `Source trivia ledger ${ledgerId} span ${span.id ?? index}`;
    if (!span?.id) {
      issues.push(`${label} is missing id`);
      continue;
    }
    spanIds.add(span.id);
    allConflictRecords.push(span);
    if (!SourceTriviaSpanKinds.includes(span.kind)) {
      issues.push(`${label} has unsupported kind ${span.kind}`);
    }
    if (!span.conflictKey) {
      issues.push(`${label} is missing conflict key`);
    }
    validateConcreteSourceSpan(span.span, `${label} source span`, issues, sourceLength);
    if (typeof span.span?.start === "number") {
      if (index === 0 && span.span.start !== 0) {
        issues.push(`${label} does not start at offset 0`);
      }
      if (span.span.start > previousEnd) {
        issues.push(`${label} leaves a gap from ${previousEnd} to ${span.span.start}`);
      } else if (span.span.start < previousEnd) {
        issues.push(`${label} overlaps previous span ending at ${previousEnd}`);
      }
    }
    if (typeof span.span?.end === "number") {
      previousEnd = span.span.end;
    }
  }
  if (spans.length > 0 && typeof ledger.sourceLength === "number" && previousEnd !== ledger.sourceLength) {
    issues.push(`Source trivia ledger ${ledgerId} spans end at ${previousEnd} but source length is ${ledger.sourceLength}`);
  }
  if (spans.length === 0 && sourceLength && sourceLength > 0) {
    issues.push(`Source trivia ledger ${ledgerId} has no spans for non-empty source length ${sourceLength}`);
  }

  for (const trivia of ledger.triviaSpans ?? []) {
    if (!spanIds.has(trivia.id)) {
      issues.push(`Source trivia ledger ${ledgerId} references missing trivia span ${trivia.id}`);
    }
    if (!TriviaKinds.has(trivia.kind)) {
      issues.push(`Source trivia ledger ${ledgerId} trivia span ${trivia.id} has non-trivia kind ${trivia.kind}`);
    }
  }

  const declarationIds = new Set();
  for (const declaration of ledger.declarations ?? []) {
    const label = `Source trivia ledger ${ledgerId} declaration ${declaration.id ?? "(unknown)"}`;
    if (!declaration?.id) {
      issues.push(`${label} is missing id`);
      continue;
    }
    if (declarationIds.has(declaration.id)) {
      issues.push(`Source trivia ledger ${ledgerId} has duplicate declaration id ${declaration.id}`);
    }
    declarationIds.add(declaration.id);
    allConflictRecords.push(declaration);
    if (!declaration.conflictKey) {
      issues.push(`${label} is missing conflict key`);
    }
    if (!DeclarationKeywords.has(declaration.keyword)) {
      issues.push(`${label} has unsupported keyword ${declaration.keyword}`);
    }
    validateConcreteSourceSpan(declaration.span, `${label} source span`, issues, sourceLength);
    for (const triviaId of declaration.leadingTriviaIds ?? []) {
      if (!spanIds.has(triviaId)) {
        issues.push(`${label} references missing leading trivia ${triviaId}`);
      }
    }
    for (const triviaId of declaration.trailingTriviaIds ?? []) {
      if (!spanIds.has(triviaId)) {
        issues.push(`${label} references missing trailing trivia ${triviaId}`);
      }
    }
  }

  const importIds = new Set();
  for (const importRecord of ledger.imports ?? []) {
    const label = `Source trivia ledger ${ledgerId} import ${importRecord.id ?? "(unknown)"}`;
    if (!importRecord?.id) {
      issues.push(`${label} is missing id`);
      continue;
    }
    if (importIds.has(importRecord.id)) {
      issues.push(`Source trivia ledger ${ledgerId} has duplicate import id ${importRecord.id}`);
    }
    importIds.add(importRecord.id);
    allConflictRecords.push(importRecord);
    if (!importRecord.conflictKey) {
      issues.push(`${label} is missing conflict key`);
    }
    validateConcreteSourceSpan(importRecord.span, `${label} source span`, issues, sourceLength);
    if (importRecord.declarationId && !declarationIds.has(importRecord.declarationId)) {
      issues.push(`${label} references missing declaration ${importRecord.declarationId}`);
    }
    for (const triviaId of importRecord.leadingTriviaIds ?? []) {
      if (!spanIds.has(triviaId)) {
        issues.push(`${label} references missing leading trivia ${triviaId}`);
      }
    }
    for (const triviaId of importRecord.trailingTriviaIds ?? []) {
      if (!spanIds.has(triviaId)) {
        issues.push(`${label} references missing trailing trivia ${triviaId}`);
      }
    }
  }

  const memberIds = new Set();
  for (const member of ledger.members ?? []) {
    const label = `Source trivia ledger ${ledgerId} member ${member.id ?? "(unknown)"}`;
    if (!member?.id) {
      issues.push(`${label} is missing id`);
      continue;
    }
    if (memberIds.has(member.id)) {
      issues.push(`Source trivia ledger ${ledgerId} has duplicate member id ${member.id}`);
    }
    memberIds.add(member.id);
    allConflictRecords.push(member);
    if (!member.conflictKey) {
      issues.push(`${label} is missing conflict key`);
    }
    if (!SourceTriviaMemberKinds.has(member.memberKind)) {
      issues.push(`${label} has unsupported member kind ${member.memberKind}`);
    }
    validateConcreteSourceSpan(member.span, `${label} source span`, issues, sourceLength);
    if (member.ownerDeclarationId && !declarationIds.has(member.ownerDeclarationId)) {
      issues.push(`${label} references missing owner declaration ${member.ownerDeclarationId}`);
    }
    for (const triviaId of member.leadingTriviaIds ?? []) {
      if (!spanIds.has(triviaId)) {
        issues.push(`${label} references missing leading trivia ${triviaId}`);
      }
    }
    for (const triviaId of member.trailingTriviaIds ?? []) {
      if (!spanIds.has(triviaId)) {
        issues.push(`${label} references missing trailing trivia ${triviaId}`);
      }
    }
  }

  const recordConflictDuplicates = duplicateValues(allConflictRecords.map((record) => record.conflictKey));
  for (const duplicate of recordConflictDuplicates) {
    issues.push(`Source trivia ledger ${ledgerId} has duplicate record conflict key ${duplicate}`);
  }
  const ledgerConflictDuplicates = duplicateValues(ledger.conflictKeys ?? []);
  for (const duplicate of ledgerConflictDuplicates) {
    issues.push(`Source trivia ledger ${ledgerId} has duplicate conflict key ${duplicate}`);
  }

  const expectedConflictKeys = collectSourceTriviaConflictKeys(ledger);
  for (const key of expectedConflictKeys) {
    if (!(ledger.conflictKeys ?? []).includes(key)) {
      issues.push(`Source trivia ledger ${ledgerId} is missing conflict key ${key}`);
    }
  }
  for (const key of ledger.conflictKeys ?? []) {
    if (!expectedConflictKeys.includes(key)) {
      issues.push(`Source trivia ledger ${ledgerId} has stale conflict key ${key}`);
    }
  }
  return issues;
}

export function sourceSpanConflictKey(record) {
  const role = record.role ?? spanRole(record.kind);
  const prefix = role === "trivia"
    ? "source-trivia"
    : role === "boundary"
      ? "source-boundary"
      : "source-span";
  const span = record.span ?? {};
  return [
    prefix,
    keyPart(record.kind),
    keyPart(record.sourcePath ?? span.path ?? record.sourceId ?? span.sourceId ?? "inline"),
    span.startLine ?? span.start ?? "",
    span.startColumn ?? "",
    span.endLine ?? span.end ?? "",
    span.endColumn ?? "",
    record.textHash ?? ""
  ].join(":");
}

export function sourceDeclarationConflictKey(record) {
  const span = record.span ?? {};
  return [
    "source-declaration",
    keyPart(record.keyword),
    keyPart(record.sourcePath ?? span.path ?? record.sourceId ?? span.sourceId ?? "inline"),
    span.startLine ?? span.start ?? "",
    span.startColumn ?? "",
    keyPart(record.name ?? ""),
    record.textHash ?? ""
  ].join(":");
}

export function sourceImportConflictKey(record) {
  const span = record.span ?? {};
  return [
    "source-import",
    keyPart(record.importKind ?? "value"),
    keyPart(record.moduleSpecifier ?? ""),
    keyPart(record.sourcePath ?? span.path ?? record.sourceId ?? span.sourceId ?? "inline"),
    span.startLine ?? span.start ?? "",
    span.startColumn ?? "",
    record.textHash ?? ""
  ].join(":");
}

export function sourceMemberConflictKey(record) {
  const span = record.span ?? {};
  return [
    "source-member",
    keyPart(record.memberKind ?? "member"),
    keyPart(record.ownerName ?? record.ownerDeclarationId ?? ""),
    keyPart(record.name ?? ""),
    keyPart(record.sourcePath ?? span.path ?? record.sourceId ?? span.sourceId ?? "inline"),
    span.startLine ?? span.start ?? "",
    span.startColumn ?? "",
    record.textHash ?? ""
  ].join(":");
}

function createSourceBoundaryRecord(sourceText, lineStarts, input) {
  const textHash = hashSemanticValue({ kind: "source", text: sourceText });
  const span = sourceSpanFromOffsets(lineStarts, input, 0, sourceText.length);
  return {
    id: `source-boundary:0:${sourceText.length}:${textHash}`,
    kind: "source",
    role: "boundary",
    span,
    textHash,
    conflictKey: sourceSpanConflictKey({
      kind: "source",
      role: "boundary",
      span,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath ?? input.path,
      textHash
    })
  };
}

function validateRangeRecord(record, label, issues, sourceLength) {
  if (!record?.id) {
    issues.push(`${label} is missing id`);
  }
  if (!record?.conflictKey) {
    issues.push(`${label} is missing conflict key`);
  }
  validateConcreteSourceSpan(record?.span, `${label} source span`, issues, sourceLength);
}

function validateConcreteSourceSpan(span, label, issues, sourceLength) {
  if (!span) {
    issues.push(`${label} is missing`);
    return;
  }
  if (typeof span.start !== "number" || typeof span.end !== "number") {
    issues.push(`${label} must include numeric start and end offsets`);
  } else {
    if (span.start < 0) {
      issues.push(`${label} starts before offset 0`);
    }
    if (span.end < 0) {
      issues.push(`${label} ends before offset 0`);
    }
    if (typeof sourceLength === "number" && span.end > sourceLength) {
      issues.push(`${label} ends at ${span.end} but source length is ${sourceLength}`);
    }
  }
  for (const key of ["startLine", "startColumn", "endLine", "endColumn"]) {
    if (span[key] !== undefined && (typeof span[key] !== "number" || span[key] < 1)) {
      issues.push(`${label} has invalid ${key} ${span[key]}`);
    }
  }
  validateSourceSpan(span, label, issues);
}

function scanSourceSpans(sourceText, lineStarts, input) {
  const spans = [];
  let offset = 0;
  let codeStart = 0;

  const flushCode = (end) => {
    if (end > codeStart) {
      spans.push(createSourceSpanRecord(sourceText, lineStarts, input, "code", codeStart, end, {}));
    }
  };

  while (offset < sourceText.length) {
    const char = sourceText[offset];
    const next = sourceText[offset + 1];

    if (isWhitespaceChar(char)) {
      flushCode(offset);
      const start = offset;
      offset = scanWhitespace(sourceText, offset);
      spans.push(createSourceSpanRecord(sourceText, lineStarts, input, "whitespace", start, offset, {
        lineBreaks: countLineBreaks(sourceText.slice(start, offset))
      }));
      codeStart = offset;
      continue;
    }

    if (char === "/" && next === "/") {
      flushCode(offset);
      const start = offset;
      offset = scanLineComment(sourceText, offset);
      spans.push(createSourceSpanRecord(sourceText, lineStarts, input, "lineComment", start, offset, {
        startDelimiter: "//",
        endDelimiter: "lineTerminator",
        closed: true
      }));
      codeStart = offset;
      continue;
    }

    if (char === "/" && next === "*") {
      flushCode(offset);
      const start = offset;
      const result = scanBlockComment(sourceText, offset);
      offset = result.end;
      spans.push(createSourceSpanRecord(sourceText, lineStarts, input, "blockComment", start, offset, {
        startDelimiter: "/*",
        endDelimiter: "*/",
        closed: result.closed,
        lineBreaks: countLineBreaks(sourceText.slice(start, offset))
      }));
      codeStart = offset;
      continue;
    }

    if (char === "\"" || char === "'") {
      flushCode(offset);
      const start = offset;
      const result = scanQuotedString(sourceText, offset, char);
      offset = result.end;
      spans.push(createSourceSpanRecord(sourceText, lineStarts, input, "string", start, offset, {
        startDelimiter: char,
        endDelimiter: char,
        closed: result.closed,
        lineBreaks: countLineBreaks(sourceText.slice(start, offset))
      }));
      codeStart = offset;
      continue;
    }

    if (char === "`") {
      flushCode(offset);
      const start = offset;
      const result = scanTemplateLiteral(sourceText, offset);
      offset = result.end;
      spans.push(createSourceSpanRecord(sourceText, lineStarts, input, "template", start, offset, {
        startDelimiter: "`",
        endDelimiter: "`",
        closed: result.closed,
        lineBreaks: countLineBreaks(sourceText.slice(start, offset))
      }));
      codeStart = offset;
      continue;
    }

    offset += 1;
  }

  flushCode(sourceText.length);
  return spans;
}

function createSourceSpanRecord(sourceText, lineStarts, input, kind, start, end, extra) {
  const text = sourceText.slice(start, end);
  const textHash = hashSemanticValue({ kind, text });
  const span = sourceSpanFromOffsets(lineStarts, input, start, end);
  const role = spanRole(kind);
  const record = {
    id: `source-span:${kind}:${start}:${end}:${textHash}`,
    kind,
    role,
    span,
    textHash,
    conflictKey: sourceSpanConflictKey({
      kind,
      role,
      span,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath ?? input.path,
      textHash
    }),
    ...extra
  };
  return record;
}

function collectSourceImports(sourceText, lineStarts, spans, input) {
  const imports = [];
  for (const span of spans) {
    if (span.kind !== "code") {
      continue;
    }
    let offset = span.span.start;
    const end = span.span.end;
    while (offset < end) {
      const char = sourceText[offset];
      if (!isIdentifierStart(char)) {
        offset += 1;
        continue;
      }
      const tokenStart = offset;
      offset = scanIdentifier(sourceText, offset);
      const word = sourceText.slice(tokenStart, offset);
      if (word !== "import" || !isDeclarationToken(sourceText, spans, word, tokenStart, offset)) {
        continue;
      }
      imports.push(createImportRecord(sourceText, lineStarts, spans, input, tokenStart, offset));
    }
  }
  return imports;
}

function createImportRecord(sourceText, lineStarts, spans, input, tokenStart, tokenEnd) {
  const details = readImportDetails(sourceText, spans, tokenStart, tokenEnd);
  const span = sourceSpanFromOffsets(lineStarts, input, tokenStart, details.declarationEnd);
  const leadingTriviaIds = collectAdjacentTriviaIds(spans, tokenStart, -1);
  const trailingTriviaIds = collectAdjacentTriviaIds(spans, details.declarationEnd, 1);
  const textHash = hashSemanticValue({
    kind: "import",
    importKind: details.importKind,
    moduleSpecifier: details.importSource,
    text: sourceText.slice(tokenStart, details.declarationEnd)
  });
  return {
    id: `source-import:${tokenStart}:${details.declarationEnd}:${textHash}`,
    importKind: details.importKind,
    moduleSpecifier: details.importSource,
    span,
    leadingTriviaIds,
    trailingTriviaIds,
    adjacentTriviaIds: unique([...leadingTriviaIds, ...trailingTriviaIds]),
    textHash,
    conflictKey: sourceImportConflictKey({
      importKind: details.importKind,
      moduleSpecifier: details.importSource,
      span,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath ?? input.path,
      textHash
    }),
    metadata: {
      keywordStart: tokenStart,
      keywordEnd: tokenEnd,
      name: details.name,
      nameStart: details.nameStart,
      nameEnd: details.nameEnd,
      moduleSpecifierStart: details.moduleSpecifierStart,
      moduleSpecifierEnd: details.moduleSpecifierEnd
    }
  };
}

function collectSourceDeclarations(sourceText, lineStarts, spans, input, imports) {
  const declarations = [];
  const importsByStart = new Map(imports.map((record) => [record.metadata.keywordStart, record]));
  for (const span of spans) {
    if (span.kind !== "code") {
      continue;
    }
    let offset = span.span.start;
    const end = span.span.end;
    while (offset < end) {
      const char = sourceText[offset];
      if (!isIdentifierStart(char)) {
        offset += 1;
        continue;
      }
      const tokenStart = offset;
      offset = scanIdentifier(sourceText, offset);
      const word = sourceText.slice(tokenStart, offset);
      if (word !== "import" && isInsideImportRecord(imports, tokenStart)) {
        continue;
      }
      if (!DeclarationKeywords.has(word) || !isDeclarationToken(sourceText, spans, word, tokenStart, offset)) {
        continue;
      }
      declarations.push(createDeclarationRecord(
        sourceText,
        lineStarts,
        spans,
        input,
        importsByStart,
        word,
        tokenStart,
        offset
      ));
    }
  }
  return declarations;
}

function createDeclarationRecord(sourceText, lineStarts, spans, input, importsByStart, keyword, tokenStart, tokenEnd) {
  const details = readDeclarationDetails(sourceText, spans, importsByStart, keyword, tokenStart, tokenEnd);
  const span = sourceSpanFromOffsets(lineStarts, input, details.declarationStart, details.declarationEnd);
  const leadingTriviaIds = collectAdjacentTriviaIds(spans, details.declarationStart, -1);
  const trailingTriviaIds = collectAdjacentTriviaIds(spans, details.declarationEnd, 1);
  const textHash = hashSemanticValue({
    keyword,
    name: details.name,
    actualKeyword: details.actualKeyword,
    text: sourceText.slice(details.declarationStart, details.declarationEnd)
  });
  const record = {
    id: `source-declaration:${keyword}:${details.declarationStart}:${details.declarationEnd}:${textHash}`,
    keyword,
    name: details.name,
    span,
    leadingTriviaIds,
    trailingTriviaIds,
    adjacentTriviaIds: unique([...leadingTriviaIds, ...trailingTriviaIds]),
    textHash,
    conflictKey: sourceDeclarationConflictKey({
      keyword,
      name: details.name,
      span,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath ?? input.path,
      textHash
    }),
    metadata: {
      keywordStart: tokenStart,
      keywordEnd: tokenEnd,
      actualKeyword: details.actualKeyword,
      actualKeywordStart: details.actualKeywordStart,
      actualKeywordEnd: details.actualKeywordEnd,
      nameStart: details.nameStart,
      nameEnd: details.nameEnd,
      importSource: details.importSource
    }
  };
  return record;
}

function readDeclarationDetails(sourceText, spans, importsByStart, keyword, tokenStart, tokenEnd) {
  if (keyword === "import") {
    const importRecord = importsByStart.get(tokenStart);
    const details = importRecord
      ? {
          declarationEnd: importRecord.span.end,
          importKind: importRecord.importKind,
          importSource: importRecord.moduleSpecifier,
          name: importRecord.metadata.name,
          nameStart: importRecord.metadata.nameStart,
          nameEnd: importRecord.metadata.nameEnd
        }
      : readImportDetails(sourceText, spans, tokenStart, tokenEnd);
    return {
      declarationStart: tokenStart,
      declarationEnd: details.declarationEnd,
      actualKeyword: "import",
      actualKeywordStart: tokenStart,
      actualKeywordEnd: tokenEnd,
      name: details.name,
      nameStart: details.nameStart,
      nameEnd: details.nameEnd,
      importSource: details.importSource
    };
  }

  let actualKeyword = keyword;
  let actualKeywordStart = tokenStart;
  let actualKeywordEnd = tokenEnd;
  if (DeclarationPrefixKeywords.has(keyword)) {
    const next = findNextDeclarationKeyword(sourceText, spans, tokenEnd);
    if (next) {
      actualKeyword = next.word;
      actualKeywordStart = next.start;
      actualKeywordEnd = next.end;
    }
  }

  const declarationStart = DeclarationPrefixKeywords.has(keyword)
    ? tokenStart
    : findDeclarationPrefixStart(sourceText, spans, tokenStart);
  const nameDetails = readDeclarationName(sourceText, spans, actualKeyword, actualKeywordEnd);
  const declarationEnd = consumeDeclarationEnd(sourceText, spans, declarationStart, actualKeyword, actualKeywordEnd);
  return {
    declarationStart,
    declarationEnd,
    actualKeyword,
    actualKeywordStart,
    actualKeywordEnd,
    name: nameDetails.name,
    nameStart: nameDetails.nameStart,
    nameEnd: nameDetails.nameEnd,
    importSource: nameDetails.importSource
  };
}

function collectSourceMembers(sourceText, lineStarts, spans, input, declarations) {
  const members = [];
  const seenRanges = new Set();
  for (const declaration of declarations) {
    const actualKeyword = declaration.metadata?.actualKeyword ?? declaration.keyword;
    if (!MemberDeclarationKeywords.has(actualKeyword)) {
      continue;
    }
    if (DeclarationPrefixKeywords.has(declaration.keyword) && declaration.keyword !== actualKeyword) {
      continue;
    }

    const body = actualKeyword === "const" || actualKeyword === "let" || actualKeyword === "var"
      ? findObjectInitializerBody(sourceText, spans, declaration)
      : findDeclarationBody(sourceText, spans, declaration);
    if (!body) {
      continue;
    }

    const memberKind = actualKeyword === "class" || actualKeyword === "interface" || actualKeyword === "type"
      ? actualKeyword
      : "object";
    collectMembersInBody(sourceText, lineStarts, spans, input, declaration, body, memberKind, members, seenRanges);
  }
  return members.sort((left, right) =>
    left.span.start - right.span.start ||
    left.span.end - right.span.end ||
    left.id.localeCompare(right.id)
  );
}

function collectMembersInBody(sourceText, lineStarts, spans, input, owner, body, memberKind, members, seenRanges) {
  let offset = body.open + 1;
  while (offset < body.close) {
    offset = skipTriviaAndMemberSeparators(sourceText, spans, offset, body.close);
    if (offset >= body.close) {
      break;
    }

    const memberStart = offset;
    const memberEnd = consumeMemberEnd(sourceText, spans, memberStart, body.close, memberKind);
    if (memberEnd <= memberStart) {
      offset += 1;
      continue;
    }

    const rangeKey = `${memberKind}:${memberStart}:${memberEnd}`;
    if (!seenRanges.has(rangeKey)) {
      seenRanges.add(rangeKey);
      members.push(createMemberRecord(sourceText, lineStarts, spans, input, owner, body, memberKind, memberStart, memberEnd));
    }
    offset = memberEnd;
  }
}

function isInsideImportRecord(imports, offset) {
  return imports.some((record) => record.span.start <= offset && offset < record.span.end);
}

function readImportDetails(sourceText, spans, tokenStart, tokenEnd) {
  const declarationEnd = consumeStatementEnd(sourceText, spans, tokenStart, sourceText.length, { stopAtLineBreak: true });
  const moduleSpecifier = findImportModuleSpecifier(sourceText, spans, tokenEnd, declarationEnd);
  const binding = readImportBindingName(sourceText, spans, tokenEnd, moduleSpecifier?.start ?? declarationEnd);
  return {
    declarationEnd,
    importKind: classifyImportKind(sourceText, spans, tokenEnd, moduleSpecifier?.start ?? declarationEnd),
    importSource: moduleSpecifier?.value,
    moduleSpecifierStart: moduleSpecifier?.start,
    moduleSpecifierEnd: moduleSpecifier?.end,
    name: binding?.name,
    nameStart: binding?.start,
    nameEnd: binding?.end
  };
}

function findImportModuleSpecifier(sourceText, spans, start, end) {
  let result;
  for (const span of spans) {
    if (span.span.end <= start) {
      continue;
    }
    if (span.span.start >= end) {
      break;
    }
    if (span.kind !== "string" && span.kind !== "template") {
      continue;
    }
    result = {
      start: span.span.start,
      end: span.span.end,
      value: stripStringDelimiters(sourceText.slice(span.span.start, span.span.end))
    };
  }
  return result;
}

function classifyImportKind(sourceText, spans, start, end) {
  const first = nextSyntaxToken(sourceText, spans, start, end);
  if (!first) {
    return "value";
  }
  if (first.kind === "string" || first.kind === "template") {
    return "sideEffect";
  }
  if (first.kind === "identifier" && first.text === "type") {
    return "type";
  }
  return "value";
}

function readImportBindingName(sourceText, spans, start, end) {
  let offset = start;
  while (offset < end) {
    const token = nextSyntaxToken(sourceText, spans, offset, end);
    if (!token) {
      return undefined;
    }
    if (
      token.kind === "identifier" &&
      token.text !== "type" &&
      token.text !== "from" &&
      token.text !== "as"
    ) {
      return { name: token.text, start: token.start, end: token.end };
    }
    offset = token.end;
  }
  return undefined;
}

function findNextDeclarationKeyword(sourceText, spans, offset) {
  let scan = offset;
  while (scan < sourceText.length) {
    const token = nextSyntaxToken(sourceText, spans, scan, sourceText.length);
    if (!token || token.kind !== "identifier") {
      return undefined;
    }
    if (DeclarationPrefixKeywords.has(token.text)) {
      scan = token.end;
      continue;
    }
    if (DeclarationBodyKeywords.has(token.text) || token.text === "import") {
      return { word: token.text, start: token.start, end: token.end };
    }
    return undefined;
  }
  return undefined;
}

function findDeclarationPrefixStart(sourceText, spans, tokenStart) {
  let declarationStart = tokenStart;
  let previous = previousCodeToken(sourceText, spans, declarationStart);
  while (previous?.kind === "identifier" && DeclarationPrefixKeywords.has(previous.text)) {
    declarationStart = previous.start;
    previous = previousCodeToken(sourceText, spans, declarationStart);
  }
  return declarationStart;
}

function readDeclarationName(sourceText, spans, actualKeyword, offset) {
  if (!DeclarationBodyKeywords.has(actualKeyword)) {
    return {};
  }

  let scan = offset;
  while (scan < sourceText.length) {
    const token = nextSyntaxToken(sourceText, spans, scan, sourceText.length);
    if (!token) {
      return {};
    }
    if (token.kind === "identifier") {
      if (isDeclarationModifier(token.text)) {
        scan = token.end;
        continue;
      }
      return { name: token.text, nameStart: token.start, nameEnd: token.end };
    }
    if (token.kind === "string" && actualKeyword === "module") {
      return {
        name: stripStringDelimiters(token.text),
        nameStart: token.start,
        nameEnd: token.end
      };
    }
    if (token.text === "{" || token.text === "(" || token.text === "=" || token.text === ";") {
      return {};
    }
    scan = token.end;
  }
  return {};
}

function consumeDeclarationEnd(sourceText, spans, declarationStart, actualKeyword, actualKeywordEnd) {
  if (
    actualKeyword === "class" ||
    actualKeyword === "interface" ||
    actualKeyword === "function" ||
    actualKeyword === "enum" ||
    actualKeyword === "namespace" ||
    actualKeyword === "module"
  ) {
    const open = findFirstCodeChar(sourceText, spans, actualKeywordEnd, sourceText.length, "{");
    if (open >= 0) {
      const close = findMatchingCodeBrace(sourceText, spans, open, sourceText.length);
      if (close >= 0) {
        return close + 1;
      }
    }
  }
  return consumeStatementEnd(sourceText, spans, declarationStart, sourceText.length, { stopAtLineBreak: true });
}

function consumeStatementEnd(sourceText, spans, start, limit, options = {}) {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let sawCode = false;
  const boundedLimit = Math.min(limit, sourceText.length);

  for (const span of spans) {
    if (span.span.end <= start) {
      continue;
    }
    if (span.span.start >= boundedLimit) {
      break;
    }
    if (span.kind !== "code") {
      if (options.stopAtLineBreak && sawCode && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && span.kind === "whitespace") {
        const lineBreakOffset = findLineTerminatorOffset(sourceText, Math.max(span.span.start, start), Math.min(span.span.end, boundedLimit));
        if (lineBreakOffset >= 0) {
          return lineBreakOffset;
        }
      }
      continue;
    }

    let offset = Math.max(start, span.span.start);
    const end = Math.min(span.span.end, boundedLimit);
    while (offset < end) {
      const char = sourceText[offset];
      sawCode = true;
      if (char === ";" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        return offset + 1;
      }
      if (char === "(") {
        parenDepth += 1;
      } else if (char === ")" && parenDepth > 0) {
        parenDepth -= 1;
      } else if (char === "[") {
        bracketDepth += 1;
      } else if (char === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (char === "{") {
        braceDepth += 1;
      } else if (char === "}") {
        if (braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
          return offset;
        }
        if (braceDepth > 0) {
          braceDepth -= 1;
        }
      }
      offset += 1;
    }
  }
  return boundedLimit;
}

function findDeclarationBody(sourceText, spans, declaration) {
  const start = declaration.metadata?.actualKeywordEnd ?? declaration.span.start;
  const open = findFirstCodeChar(sourceText, spans, start, declaration.span.end, "{");
  if (open < 0) {
    return undefined;
  }
  const close = findMatchingCodeBrace(sourceText, spans, open, declaration.span.end);
  if (close < 0) {
    return undefined;
  }
  return { open, close };
}

function findObjectInitializerBody(sourceText, spans, declaration) {
  const equals = findFirstCodeChar(sourceText, spans, declaration.metadata?.nameEnd ?? declaration.span.start, declaration.span.end, "=");
  if (equals < 0) {
    return undefined;
  }
  const next = nextSyntaxToken(sourceText, spans, equals + 1, declaration.span.end);
  if (!next || next.text !== "{") {
    return undefined;
  }
  const close = findMatchingCodeBrace(sourceText, spans, next.start, declaration.span.end);
  if (close < 0) {
    return undefined;
  }
  return { open: next.start, close };
}

function createMemberRecord(sourceText, lineStarts, spans, input, owner, body, memberKind, start, end) {
  const nameDetails = readMemberName(sourceText, spans, memberKind, start, end);
  const span = sourceSpanFromOffsets(lineStarts, input, start, end);
  const leadingTriviaIds = collectAdjacentTriviaIds(spans, start, -1);
  const trailingTriviaIds = collectAdjacentTriviaIds(spans, end, 1);
  const textHash = hashSemanticValue({
    kind: "member",
    memberKind,
    ownerName: owner.name,
    name: nameDetails.name,
    text: sourceText.slice(start, end)
  });
  return {
    id: `source-member:${memberKind}:${start}:${end}:${textHash}`,
    memberKind,
    name: nameDetails.name,
    ownerDeclarationId: owner.id,
    ownerName: owner.name,
    span,
    leadingTriviaIds,
    trailingTriviaIds,
    adjacentTriviaIds: unique([...leadingTriviaIds, ...trailingTriviaIds]),
    textHash,
    conflictKey: sourceMemberConflictKey({
      memberKind,
      ownerDeclarationId: owner.id,
      ownerName: owner.name,
      name: nameDetails.name,
      span,
      sourceId: input.sourceId,
      sourcePath: input.sourcePath ?? input.path,
      textHash
    }),
    metadata: {
      ownerKeyword: owner.metadata?.actualKeyword ?? owner.keyword,
      bodyStart: body.open,
      bodyEnd: body.close,
      nameStart: nameDetails.nameStart,
      nameEnd: nameDetails.nameEnd,
      computed: nameDetails.computed
    }
  };
}

function readMemberName(sourceText, spans, memberKind, start, end) {
  let offset = start;
  while (offset < end) {
    const token = nextSyntaxToken(sourceText, spans, offset, end);
    if (!token) {
      return {};
    }
    if (token.kind === "identifier") {
      if (isMemberModifier(token.text, memberKind)) {
        offset = token.end;
        continue;
      }
      return { name: token.text, nameStart: token.start, nameEnd: token.end };
    }
    if (token.kind === "string") {
      return {
        name: stripStringDelimiters(token.text),
        nameStart: token.start,
        nameEnd: token.end
      };
    }
    if (token.text === "#") {
      const next = nextSyntaxToken(sourceText, spans, token.end, end);
      if (next?.kind === "identifier") {
        return {
          name: `#${next.text}`,
          nameStart: token.start,
          nameEnd: next.end
        };
      }
    }
    if (token.text === "[") {
      const close = findMatchingCodeBracket(sourceText, spans, token.start, end);
      if (close >= 0) {
        return {
          name: sourceText.slice(token.start, close + 1),
          nameStart: token.start,
          nameEnd: close + 1,
          computed: true
        };
      }
    }
    return {};
  }
  return {};
}

function isMemberModifier(name, memberKind) {
  if (memberKind === "object") {
    return false;
  }
  return name === "public" ||
    name === "private" ||
    name === "protected" ||
    name === "readonly" ||
    name === "static" ||
    name === "abstract" ||
    name === "async" ||
    name === "declare" ||
    name === "override" ||
    name === "accessor" ||
    name === "get" ||
    name === "set";
}

function skipTriviaAndMemberSeparators(sourceText, spans, offset, limit) {
  let cursor = offset;
  let progressed = true;
  while (progressed && cursor < limit) {
    progressed = false;
    const span = spanAtOffset(spans, cursor);
    if (span && TriviaKinds.has(span.kind)) {
      cursor = Math.min(span.span.end, limit);
      progressed = true;
      continue;
    }
    const char = sourceText[cursor];
    if (char === ";" || char === ",") {
      cursor += 1;
      progressed = true;
    }
  }
  return cursor;
}

function consumeMemberEnd(sourceText, spans, start, limit, memberKind) {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let sawAssignmentOrColon = false;

  for (const span of spans) {
    if (span.span.end <= start) {
      continue;
    }
    if (span.span.start >= limit) {
      break;
    }
    if (span.kind !== "code") {
      continue;
    }
    let offset = Math.max(start, span.span.start);
    const end = Math.min(span.span.end, limit);
    while (offset < end) {
      const char = sourceText[offset];
      const topLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;
      if ((char === ";" || char === ",") && topLevel) {
        return offset + 1;
      }
      if ((char === ":" || char === "=") && topLevel) {
        sawAssignmentOrColon = true;
      }
      if (char === "(") {
        parenDepth += 1;
      } else if (char === ")" && parenDepth > 0) {
        parenDepth -= 1;
      } else if (char === "[") {
        bracketDepth += 1;
      } else if (char === "]" && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (char === "{") {
        if ((memberKind === "class" || memberKind === "object") && topLevel && !sawAssignmentOrColon) {
          const close = findMatchingCodeBrace(sourceText, spans, offset, limit);
          if (close >= 0) {
            return close + 1;
          }
        }
        braceDepth += 1;
      } else if (char === "}" && braceDepth > 0) {
        braceDepth -= 1;
      }
      offset += 1;
    }
  }
  return trimTrailingWhitespace(sourceText, start, limit);
}

function nextSyntaxToken(sourceText, spans, offset, limit) {
  const boundedLimit = Math.min(limit, sourceText.length);
  for (const span of spans) {
    if (span.span.end <= offset) {
      continue;
    }
    if (span.span.start >= boundedLimit) {
      break;
    }
    if (TriviaKinds.has(span.kind)) {
      continue;
    }
    if (span.kind === "string" || span.kind === "template") {
      return {
        kind: span.kind,
        text: sourceText.slice(span.span.start, span.span.end),
        start: span.span.start,
        end: span.span.end
      };
    }
    if (span.kind !== "code") {
      continue;
    }
    let scan = Math.max(offset, span.span.start);
    const end = Math.min(span.span.end, boundedLimit);
    while (scan < end) {
      const char = sourceText[scan];
      if (isIdentifierStart(char)) {
        const tokenEnd = scanIdentifier(sourceText, scan);
        return {
          kind: "identifier",
          text: sourceText.slice(scan, tokenEnd),
          start: scan,
          end: tokenEnd
        };
      }
      return {
        kind: "punctuation",
        text: char,
        start: scan,
        end: scan + 1
      };
    }
  }
  return undefined;
}

function previousCodeToken(sourceText, spans, offset) {
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index];
    if (span.kind !== "code" || span.span.start >= offset) {
      continue;
    }
    let scan = Math.min(offset, span.span.end) - 1;
    if (scan < span.span.start) {
      continue;
    }
    const char = sourceText[scan];
    if (isIdentifierPart(char)) {
      const end = scan + 1;
      while (scan >= span.span.start && isIdentifierPart(sourceText[scan])) {
        scan -= 1;
      }
      return {
        kind: "identifier",
        text: sourceText.slice(scan + 1, end),
        start: scan + 1,
        end
      };
    }
    return {
      kind: "punctuation",
      text: char,
      start: scan,
      end: scan + 1
    };
  }
  return undefined;
}

function findFirstCodeChar(sourceText, spans, start, limit, target) {
  const boundedLimit = Math.min(limit, sourceText.length);
  for (const span of spans) {
    if (span.kind !== "code" || span.span.end <= start) {
      continue;
    }
    if (span.span.start >= boundedLimit) {
      break;
    }
    let offset = Math.max(start, span.span.start);
    const end = Math.min(span.span.end, boundedLimit);
    while (offset < end) {
      if (target === undefined || sourceText[offset] === target) {
        return offset;
      }
      offset += 1;
    }
  }
  return -1;
}

function findMatchingCodeBrace(sourceText, spans, open, limit) {
  return findMatchingCodePair(sourceText, spans, open, limit, "{", "}");
}

function findMatchingCodeBracket(sourceText, spans, open, limit) {
  return findMatchingCodePair(sourceText, spans, open, limit, "[", "]");
}

function findMatchingCodePair(sourceText, spans, open, limit, openChar, closeChar) {
  let depth = 0;
  const boundedLimit = Math.min(limit, sourceText.length);
  for (const span of spans) {
    if (span.kind !== "code" || span.span.end <= open) {
      continue;
    }
    if (span.span.start >= boundedLimit) {
      break;
    }
    let offset = Math.max(open, span.span.start);
    const end = Math.min(span.span.end, boundedLimit);
    while (offset < end) {
      const char = sourceText[offset];
      if (char === openChar) {
        depth += 1;
      } else if (char === closeChar) {
        depth -= 1;
        if (depth === 0) {
          return offset;
        }
      }
      offset += 1;
    }
  }
  return -1;
}

function spanAtOffset(spans, offset) {
  for (const span of spans) {
    if (span.span.start <= offset && offset < span.span.end) {
      return span;
    }
  }
  return undefined;
}

function trimTrailingWhitespace(sourceText, start, end) {
  let cursor = end;
  while (cursor > start && isWhitespaceChar(sourceText[cursor - 1])) {
    cursor -= 1;
  }
  return cursor;
}

function findLineTerminatorOffset(sourceText, start, end) {
  for (let offset = start; offset < end; offset += 1) {
    if (isLineTerminator(sourceText[offset])) {
      return offset;
    }
  }
  return -1;
}

function isDeclarationToken(sourceText, spans, keyword, start, end) {
  const previous = previousCodeChar(sourceText, spans, start);
  if (previous && previous.char === ".") {
    return false;
  }

  const next = nextCodeChar(sourceText, spans, end);
  if (next && next.char === ":") {
    return false;
  }
  if (keyword === "import" && next && next.char === "(") {
    return false;
  }
  return true;
}

function previousCodeChar(sourceText, spans, offset) {
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index];
    if (span.kind !== "code" || span.span.start >= offset) {
      continue;
    }
    const scanStart = span.span.start;
    const scanEnd = Math.min(offset, span.span.end);
    for (let scan = scanEnd - 1; scan >= scanStart; scan -= 1) {
      return { char: sourceText[scan], offset: scan };
    }
  }
  return undefined;
}

function nextCodeChar(sourceText, spans, offset) {
  for (const span of spans) {
    if (span.kind !== "code" || span.span.end <= offset) {
      continue;
    }
    const scan = Math.max(offset, span.span.start);
    if (scan < span.span.end) {
      return { char: sourceText[scan], offset: scan };
    }
  }
  return undefined;
}

function collectAdjacentTriviaIds(spans, offset, direction) {
  const ids = [];
  if (direction < 0) {
    let cursor = offset;
    for (let index = spans.length - 1; index >= 0; index -= 1) {
      const span = spans[index];
      if (span.span.end > cursor) {
        continue;
      }
      if (span.span.end !== cursor || !TriviaKinds.has(span.kind)) {
        break;
      }
      ids.unshift(span.id);
      cursor = span.span.start;
    }
    return ids;
  }

  let cursor = offset;
  for (const span of spans) {
    if (span.span.start < cursor) {
      continue;
    }
    if (span.span.start !== cursor || !TriviaKinds.has(span.kind)) {
      break;
    }
    ids.push(span.id);
    cursor = span.span.end;
  }
  return ids;
}

function computeLineStarts(sourceText) {
  const lineStarts = [0];
  for (let index = 0; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (char === "\r") {
      if (sourceText[index + 1] === "\n") {
        lineStarts.push(index + 2);
        index += 1;
      } else {
        lineStarts.push(index + 1);
      }
      continue;
    }
    if (char === "\n") {
      lineStarts.push(index + 1);
    }
  }
  return lineStarts;
}

function sourceSpanFromOffsets(lineStarts, input, start, end) {
  const startPosition = positionAt(lineStarts, start);
  const endPosition = positionAt(lineStarts, end);
  return {
    sourceId: input.sourceId,
    path: input.sourcePath ?? input.path,
    start,
    end,
    startLine: startPosition.line,
    startColumn: startPosition.column,
    endLine: endPosition.line,
    endColumn: endPosition.column
  };
}

function positionAt(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= offset) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  const lineIndex = Math.max(0, high);
  return {
    line: lineIndex + 1,
    column: offset - lineStarts[lineIndex] + 1
  };
}

function scanWhitespace(sourceText, offset) {
  while (offset < sourceText.length && isWhitespaceChar(sourceText[offset])) {
    offset += 1;
  }
  return offset;
}

function scanLineComment(sourceText, offset) {
  offset += 2;
  while (offset < sourceText.length && !isLineTerminator(sourceText[offset])) {
    offset += 1;
  }
  return offset;
}

function scanBlockComment(sourceText, offset) {
  offset += 2;
  while (offset < sourceText.length) {
    if (sourceText[offset] === "*" && sourceText[offset + 1] === "/") {
      return { end: offset + 2, closed: true };
    }
    offset += 1;
  }
  return { end: offset, closed: false };
}

function scanQuotedString(sourceText, offset, quote) {
  offset += 1;
  let escaped = false;
  while (offset < sourceText.length) {
    const char = sourceText[offset];
    if (escaped) {
      escaped = false;
      offset += 1;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      offset += 1;
      continue;
    }
    if (char === quote) {
      return { end: offset + 1, closed: true };
    }
    offset += 1;
  }
  return { end: offset, closed: false };
}

function scanTemplateLiteral(sourceText, offset) {
  offset += 1;
  let escaped = false;
  while (offset < sourceText.length) {
    const char = sourceText[offset];
    if (escaped) {
      escaped = false;
      offset += 1;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      offset += 1;
      continue;
    }
    if (char === "`") {
      return { end: offset + 1, closed: true };
    }
    offset += 1;
  }
  return { end: offset, closed: false };
}

function countLineBreaks(text) {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\r") {
      count += 1;
      if (text[index + 1] === "\n") {
        index += 1;
      }
      continue;
    }
    if (text[index] === "\n") {
      count += 1;
    }
  }
  return count;
}

function isWhitespaceChar(char) {
  return char === " " ||
    char === "\t" ||
    char === "\n" ||
    char === "\r" ||
    char === "\v" ||
    char === "\f";
}

function isLineTerminator(char) {
  return char === "\n" || char === "\r";
}

function isIdentifierStart(char) {
  return Boolean(char && (/[A-Za-z_$]/).test(char));
}

function isIdentifierPart(char) {
  return Boolean(char && (/[A-Za-z0-9_$]/).test(char));
}

function scanIdentifier(sourceText, offset) {
  offset += 1;
  while (offset < sourceText.length && isIdentifierPart(sourceText[offset])) {
    offset += 1;
  }
  return offset;
}

function isDeclarationModifier(name) {
  return name === "default" ||
    name === "async" ||
    name === "abstract" ||
    name === "readonly" ||
    name === "public" ||
    name === "private" ||
    name === "protected" ||
    name === "static" ||
    name === "declare" ||
    name === "type";
}

function stripStringDelimiters(text) {
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === "\"" || first === "'" || first === "`") && first === last) {
      return text.slice(1, -1);
    }
  }
  return text;
}

function spanRole(kind) {
  if (TriviaKinds.has(kind)) {
    return "trivia";
  }
  if (BoundaryKinds.has(kind)) {
    return "boundary";
  }
  return "source";
}

function sourceLedgerIdentity(input) {
  return input.sourcePath ?? input.path ?? input.sourceId ?? "inline";
}

function keyPart(value) {
  return String(value ?? "")
    .replaceAll("%", "%25")
    .replaceAll(":", "%3A")
    .replaceAll("\n", "%0A")
    .replaceAll("\r", "%0D");
}
