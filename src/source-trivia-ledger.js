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

export function createSourceTriviaLedger(input) {
  const sourceText = String(input.sourceText ?? "");
  const lineStarts = computeLineStarts(sourceText);
  const sourceHash = input.sourceHash ?? hashSemanticValue(sourceText);
  const sourceIdentity = sourceLedgerIdentity(input);
  const spans = scanSourceSpans(sourceText, lineStarts, input);
  const triviaSpans = spans.filter((span) => TriviaKinds.has(span.kind));
  const declarations = collectSourceDeclarations(sourceText, lineStarts, spans, input);
  const conflictKeys = collectSourceTriviaConflictKeys({
    spans,
    declarations
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
    spans,
    triviaSpans,
    declarations,
    conflictKeys,
    metadata: input.metadata
  };
}

export function collectSourceTriviaConflictKeys(input, options = {}) {
  const includeSourceSpans = options.includeSourceSpans ?? true;
  const includeDeclarations = options.includeDeclarations ?? true;
  return unique([
    ...(includeSourceSpans ? (input.spans ?? []).map((span) => span.conflictKey) : []),
    ...(includeDeclarations ? (input.declarations ?? []).map((declaration) => declaration.conflictKey) : [])
  ].filter(Boolean)).sort(ordinalCompare);
}

export function validateSourceTriviaLedgerRecord(ledger) {
  const issues = [];
  if (ledger.kind !== "frontier.lang.sourceTriviaLedger") {
    issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} has invalid kind`);
  }
  if (ledger.version !== 1) {
    issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} has unsupported version ${ledger.version}`);
  }
  if (!ledger.id) {
    issues.push("Source trivia ledger is missing id");
  }

  const spans = ledger.spans ?? [];
  const spanIds = new Set();
  const spanIdDuplicates = duplicateValues(spans.map((span) => span.id));
  for (const duplicate of spanIdDuplicates) {
    issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} has duplicate span id ${duplicate}`);
  }
  const spanConflictDuplicates = duplicateValues(spans.map((span) => span.conflictKey));
  for (const duplicate of spanConflictDuplicates) {
    issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} has duplicate span conflict key ${duplicate}`);
  }

  let previousEnd = 0;
  for (const [index, span] of spans.entries()) {
    const label = `Source trivia ledger ${ledger.id ?? "(unknown)"} span ${span.id ?? index}`;
    if (!span?.id) {
      issues.push(`${label} is missing id`);
      continue;
    }
    spanIds.add(span.id);
    if (!SourceTriviaSpanKinds.includes(span.kind)) {
      issues.push(`${label} has unsupported kind ${span.kind}`);
    }
    if (!span.conflictKey) {
      issues.push(`${label} is missing conflict key`);
    }
    validateSourceSpan(span.span, `${label} source span`, issues);
    if (typeof span.span?.start === "number") {
      if (index === 0 && span.span.start !== 0) {
        issues.push(`${label} does not start at offset 0`);
      }
      if (span.span.start !== previousEnd) {
        issues.push(`${label} starts at ${span.span.start} but previous span ended at ${previousEnd}`);
      }
    }
    if (typeof span.span?.end === "number") {
      previousEnd = span.span.end;
    }
  }
  if (spans.length > 0 && typeof ledger.sourceLength === "number" && previousEnd !== ledger.sourceLength) {
    issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} spans end at ${previousEnd} but source length is ${ledger.sourceLength}`);
  }

  for (const trivia of ledger.triviaSpans ?? []) {
    if (!spanIds.has(trivia.id)) {
      issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} references missing trivia span ${trivia.id}`);
    }
    if (!TriviaKinds.has(trivia.kind)) {
      issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} trivia span ${trivia.id} has non-trivia kind ${trivia.kind}`);
    }
  }

  const declarationIds = new Set();
  for (const declaration of ledger.declarations ?? []) {
    const label = `Source trivia ledger ${ledger.id ?? "(unknown)"} declaration ${declaration.id ?? "(unknown)"}`;
    if (!declaration?.id) {
      issues.push(`${label} is missing id`);
      continue;
    }
    if (declarationIds.has(declaration.id)) {
      issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} has duplicate declaration id ${declaration.id}`);
    }
    declarationIds.add(declaration.id);
    if (!declaration.conflictKey) {
      issues.push(`${label} is missing conflict key`);
    }
    if (!DeclarationKeywords.has(declaration.keyword)) {
      issues.push(`${label} has unsupported keyword ${declaration.keyword}`);
    }
    validateSourceSpan(declaration.span, `${label} source span`, issues);
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

  const expectedConflictKeys = collectSourceTriviaConflictKeys(ledger);
  for (const key of expectedConflictKeys) {
    if (!(ledger.conflictKeys ?? []).includes(key)) {
      issues.push(`Source trivia ledger ${ledger.id ?? "(unknown)"} is missing conflict key ${key}`);
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

function collectSourceDeclarations(sourceText, lineStarts, spans, input) {
  const declarations = [];
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
      if (!DeclarationKeywords.has(word) || !isDeclarationToken(sourceText, spans, word, tokenStart, offset)) {
        continue;
      }
      declarations.push(createDeclarationRecord(sourceText, lineStarts, spans, input, word, tokenStart, offset));
    }
  }
  return declarations;
}

function createDeclarationRecord(sourceText, lineStarts, spans, input, keyword, tokenStart, tokenEnd) {
  const details = readDeclarationDetails(sourceText, spans, keyword, tokenEnd);
  const declarationEnd = details.nameEnd ?? tokenEnd;
  const span = sourceSpanFromOffsets(lineStarts, input, tokenStart, declarationEnd);
  const leadingTriviaIds = collectAdjacentTriviaIds(spans, tokenStart, -1);
  const trailingTriviaIds = collectAdjacentTriviaIds(spans, declarationEnd, 1);
  const textHash = hashSemanticValue({
    keyword,
    name: details.name,
    text: sourceText.slice(tokenStart, declarationEnd)
  });
  const record = {
    id: `source-declaration:${keyword}:${tokenStart}:${declarationEnd}:${textHash}`,
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
      keywordEnd: tokenEnd,
      nameStart: details.nameStart,
      nameEnd: details.nameEnd,
      importSource: details.importSource
    }
  };
  return record;
}

function readDeclarationDetails(sourceText, spans, keyword, offset) {
  let importSource;
  for (const span of spans) {
    if (span.span.end <= offset) {
      continue;
    }
    if (span.kind === "string" && keyword === "import" && importSource === undefined) {
      importSource = stripStringDelimiters(sourceText.slice(span.span.start, span.span.end));
      continue;
    }
    if (span.kind !== "code") {
      continue;
    }
    let scan = Math.max(offset, span.span.start);
    while (scan < span.span.end) {
      const char = sourceText[scan];
      if (char === ";" || ((char === "{" || char === "}") && keyword !== "import" && keyword !== "export")) {
        return { importSource };
      }
      if (!isIdentifierStart(char)) {
        scan += 1;
        continue;
      }
      const start = scan;
      const end = scanIdentifier(sourceText, scan);
      const name = sourceText.slice(start, end);
      if (!isDeclarationModifier(name)) {
        return {
          name,
          nameStart: start,
          nameEnd: end,
          importSource
        };
      }
      scan = end;
    }
  }
  return { importSource };
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
