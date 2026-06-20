import { hashSemanticValue } from "./hashing.js";

const DECLARATION_KEYWORDS = new Set([
  "class",
  "const",
  "enum",
  "function",
  "interface",
  "let",
  "type",
  "var"
]);
const EXPORT_MODIFIERS = new Set(["abstract", "async", "declare", "default"]);

export function scanSourceRoundtrip(input) {
  const sourceText = getSourceText(input);
  const path = getInputValue(input, "path");
  const language = getInputValue(input, "language");
  const id = getInputValue(input, "id") ?? `source-roundtrip-scan:${path ?? "inline"}`;
  const sourceHash = getInputValue(input, "sourceHash") ?? hashSemanticValue(sourceText);
  const segments = scanSegments(sourceText);
  const features = collectSourceRoundtripFeatures(sourceText);

  return {
    kind: "frontier.lang.sourceRoundtripScan",
    version: 1,
    id,
    ...(path ? { path } : {}),
    ...(language ? { language } : {}),
    sourceHash,
    sourceLength: sourceText.length,
    segments,
    features,
    featureSummary: summarizeFeatures(features),
    metadata: getInputValue(input, "metadata")
  };
}

export function reconstructSourceRoundtrip(scan) {
  return (scan.segments ?? []).map((segment) => segment.text ?? "").join("");
}

export function verifyNoopSourceRoundtrip(input, options = {}) {
  const scan = input?.scan ?? scanSourceRoundtrip(input);
  const sourceText = getSourceText(input) || reconstructSourceRoundtrip(scan);
  const reconstructedText = input?.reconstructedText ?? options.reconstructedText ?? reconstructSourceRoundtrip(scan);
  const sourceHash = scan.sourceHash ?? hashSemanticValue(sourceText);
  const reconstructedHash = hashSemanticValue(reconstructedText);
  const issues = [];
  const firstDifference = sourceText === reconstructedText ? undefined : findFirstDifference(sourceText, reconstructedText);

  if (firstDifference) {
    issues.push(`No-op source roundtrip changed ${scan.path ?? "inline source"} at offset ${firstDifference.offset}`);
  }

  const status = issues.length === 0 ? "passed" : "failed";
  const id = input?.reportId ?? options.id ?? `source-noop-roundtrip:${scan.id}`;
  const evidenceId = input?.evidenceId ?? options.evidenceId ?? `evidence:${id}`;
  const metadata = {
    reportKind: "frontier.lang.sourceNoopRoundtripReport",
    reportId: id,
    scanId: scan.id,
    ...(scan.path ? { path: scan.path } : {}),
    ...(scan.language ? { language: scan.language } : {}),
    sourceHash,
    reconstructedHash,
    sourceLength: sourceText.length,
    reconstructedLength: reconstructedText.length,
    featureSummary: scan.featureSummary ?? summarizeFeatures(scan.features ?? []),
    issues,
    ...(firstDifference ? { firstDifference } : {})
  };

  return {
    kind: "frontier.lang.sourceNoopRoundtripReport",
    version: 1,
    id,
    status,
    scan,
    sourceHash,
    reconstructedHash,
    sourceLength: sourceText.length,
    reconstructedLength: reconstructedText.length,
    issues,
    ...(firstDifference ? { firstDifference } : {}),
    evidence: {
      id: evidenceId,
      kind: "test",
      status,
      path: scan.path,
      summary: status === "passed"
        ? `No-op source roundtrip preserved ${scan.path ?? "inline source"}.`
        : `No-op source roundtrip changed ${scan.path ?? "inline source"}.`,
      metadata
    }
  };
}

function scanSegments(sourceText) {
  const segments = [];
  let index = 0;

  while (index < sourceText.length) {
    const start = index;
    let kind = "text";

    if (isWhitespace(sourceText[index])) {
      index = consumeWhitespace(sourceText, index);
      kind = "whitespace";
    } else if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      kind = "comment";
    } else if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      kind = "stringLiteral";
    } else if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      kind = "templateLiteral";
    } else if (hasKeywordAt(sourceText, index, "import")) {
      index = consumeStatement(sourceText, index);
      kind = "importDeclaration";
    } else if (hasKeywordAt(sourceText, index, "export")) {
      index = consumeExportDeclaration(sourceText, index);
      kind = "exportDeclaration";
    } else if (hasKeywordAt(sourceText, index, "class")) {
      index = consumeDeclarationLike(sourceText, index);
      kind = "classDeclaration";
    } else if (hasKeywordAt(sourceText, index, "interface")) {
      index = consumeDeclarationLike(sourceText, index);
      kind = "interfaceDeclaration";
    } else if (isIdentifierStart(sourceText[index])) {
      index = consumeIdentifier(sourceText, index);
      kind = "identifier";
    } else {
      index += 1;
      kind = "punctuation";
    }

    segments.push(createSliceRecord("segment", kind, start, index, sourceText));
  }

  return segments;
}

function collectSourceRoundtripFeatures(sourceText) {
  const features = [];
  const seen = new Set();
  collectLexicalFeatures(sourceText, features, seen);
  collectDeclarationFeatures(sourceText, features, seen);
  return features.sort((left, right) =>
    left.start - right.start ||
    left.end - right.end ||
    left.kind.localeCompare(right.kind)
  );
}

function collectLexicalFeatures(sourceText, features, seen) {
  let index = 0;
  while (index < sourceText.length) {
    const start = index;
    if (isWhitespace(sourceText[index])) {
      index = consumeWhitespace(sourceText, index);
      addFeature(features, seen, createSliceRecord("feature", "whitespace", start, index, sourceText));
    } else if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      addFeature(features, seen, createSliceRecord("feature", "comment", start, index, sourceText));
    } else if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
    } else if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      addFeature(features, seen, createSliceRecord("feature", "templateLiteral", start, index, sourceText));
    } else {
      index += 1;
    }
  }
}

function collectDeclarationFeatures(sourceText, features, seen) {
  let index = 0;
  while (index < sourceText.length) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }

    if (hasKeywordAt(sourceText, index, "import")) {
      const end = consumeStatement(sourceText, index);
      addFeature(features, seen, createSliceRecord("feature", "importDeclaration", index, end, sourceText));
      index = end;
      continue;
    }

    if (hasKeywordAt(sourceText, index, "export")) {
      const end = consumeExportDeclaration(sourceText, index);
      const exportFeature = createSliceRecord("feature", "exportDeclaration", index, end, sourceText);
      addFeature(features, seen, exportFeature);
      collectNestedDeclarationFeature(sourceText, index, end, exportFeature.id, features, seen);
      index = end;
      continue;
    }

    if (hasKeywordAt(sourceText, index, "class") || hasKeywordAt(sourceText, index, "interface")) {
      const declarationKind = hasKeywordAt(sourceText, index, "class") ? "classDeclaration" : "interfaceDeclaration";
      const end = consumeDeclarationLike(sourceText, index);
      const declarationFeature = createSliceRecord("feature", declarationKind, index, end, sourceText);
      addFeature(features, seen, declarationFeature);
      collectMemberFeatures(sourceText, index, end, declarationKind, declarationFeature.id, features, seen);
      index = end;
      continue;
    }

    index += 1;
  }
}

function collectNestedDeclarationFeature(sourceText, start, end, parentId, features, seen) {
  const nested = findClassOrInterfaceKeyword(sourceText, start, end);
  if (!nested) {
    return;
  }
  const declarationEnd = consumeDeclarationLike(sourceText, nested.index);
  const boundedEnd = Math.min(declarationEnd, end);
  const declarationKind = nested.keyword === "class" ? "classDeclaration" : "interfaceDeclaration";
  const declarationFeature = {
    ...createSliceRecord("feature", declarationKind, nested.index, boundedEnd, sourceText),
    parentId
  };
  addFeature(features, seen, declarationFeature);
  collectMemberFeatures(sourceText, nested.index, boundedEnd, declarationKind, declarationFeature.id, features, seen);
}

function collectMemberFeatures(sourceText, declarationStart, declarationEnd, declarationKind, parentId, features, seen) {
  const open = findFirstCodeChar(sourceText, declarationStart, declarationEnd, "{");
  if (open < 0) {
    return;
  }
  const close = findMatchingBrace(sourceText, open, declarationEnd);
  if (close < 0) {
    return;
  }

  const memberKind = declarationKind === "classDeclaration" ? "classMember" : "interfaceMember";
  let index = open + 1;
  while (index < close) {
    index = skipWhitespaceAndComments(sourceText, index, close);
    if (index >= close) {
      break;
    }
    const memberStart = index;
    const memberEnd = consumeMember(sourceText, memberStart, close);
    if (memberEnd <= memberStart) {
      index += 1;
      continue;
    }
    addFeature(features, seen, {
      ...createSliceRecord("feature", memberKind, memberStart, memberEnd, sourceText),
      parentId
    });
    index = memberEnd;
  }
}

function consumeMember(sourceText, start, limit) {
  let index = start;
  let parenDepth = 0;
  let bracketDepth = 0;

  while (index < limit) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }

    const char = sourceText[index];
    if (char === "(") parenDepth += 1;
    else if (char === ")" && parenDepth > 0) parenDepth -= 1;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]" && bracketDepth > 0) bracketDepth -= 1;
    else if (char === "{" && parenDepth === 0 && bracketDepth === 0) {
      const blockEnd = consumeBalancedBlock(sourceText, index, limit);
      const semicolon = skipWhitespaceAndComments(sourceText, blockEnd, limit);
      return sourceText[semicolon] === ";" ? semicolon + 1 : blockEnd;
    } else if ((char === ";" || char === ",") && parenDepth === 0 && bracketDepth === 0) {
      return index + 1;
    }
    index += 1;
  }

  return limit;
}

function consumeExportDeclaration(sourceText, start) {
  const keyword = readExportDeclarationKeyword(sourceText, start);
  if (!keyword || keyword === "{") {
    return consumeStatement(sourceText, start);
  }
  if (DECLARATION_KEYWORDS.has(keyword)) {
    return consumeDeclarationLike(sourceText, start);
  }
  return consumeStatement(sourceText, start);
}

function readExportDeclarationKeyword(sourceText, start) {
  let index = start + "export".length;
  for (let attempts = 0; attempts < 6; attempts += 1) {
    index = skipWhitespaceAndComments(sourceText, index, sourceText.length);
    const char = sourceText[index];
    if (char === "{") {
      return "{";
    }
    if (!isIdentifierStart(char)) {
      return undefined;
    }
    const end = consumeIdentifier(sourceText, index);
    const word = sourceText.slice(index, end);
    if (!EXPORT_MODIFIERS.has(word)) {
      return word;
    }
    index = end;
  }
  return undefined;
}

function consumeDeclarationLike(sourceText, start) {
  let index = start;
  while (index < sourceText.length) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }

    if (sourceText[index] === "{") {
      const blockEnd = consumeBalancedBlock(sourceText, index, sourceText.length);
      const semicolon = skipWhitespaceAndComments(sourceText, blockEnd, sourceText.length);
      return sourceText[semicolon] === ";" ? semicolon + 1 : blockEnd;
    }
    if (sourceText[index] === ";") {
      return index + 1;
    }
    index += 1;
  }
  return sourceText.length;
}

function consumeStatement(sourceText, start) {
  let index = start;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  while (index < sourceText.length) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }

    const char = sourceText[index];
    if (char === "(") parenDepth += 1;
    else if (char === ")" && parenDepth > 0) parenDepth -= 1;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]" && bracketDepth > 0) bracketDepth -= 1;
    else if (char === "{") braceDepth += 1;
    else if (char === "}" && braceDepth > 0) braceDepth -= 1;
    else if (char === ";" && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      return index + 1;
    }
    index += 1;
  }

  return sourceText.length;
}

function consumeBalancedBlock(sourceText, openIndex, limit) {
  let index = openIndex + 1;
  let depth = 1;
  while (index < limit && depth > 0) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }

    if (sourceText[index] === "{") depth += 1;
    else if (sourceText[index] === "}") depth -= 1;
    index += 1;
  }
  return index;
}

function consumeTemplateLiteral(sourceText, start) {
  let index = start + 1;
  while (index < sourceText.length) {
    if (sourceText[index] === "\\") {
      index += 2;
      continue;
    }
    if (sourceText[index] === "`") {
      return index + 1;
    }
    if (sourceText[index] === "$" && sourceText[index + 1] === "{") {
      index = consumeTemplateExpression(sourceText, index + 2);
      continue;
    }
    index += 1;
  }
  return sourceText.length;
}

function consumeTemplateExpression(sourceText, start) {
  let index = start;
  let depth = 1;
  while (index < sourceText.length && depth > 0) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "{") depth += 1;
    else if (sourceText[index] === "}") depth -= 1;
    index += 1;
  }
  return index;
}

function consumeQuotedLiteral(sourceText, start) {
  const quote = sourceText[start];
  let index = start + 1;
  while (index < sourceText.length) {
    if (sourceText[index] === "\\") {
      index += 2;
      continue;
    }
    if (sourceText[index] === quote) {
      return index + 1;
    }
    index += 1;
  }
  return sourceText.length;
}

function consumeComment(sourceText, start) {
  if (startsLineComment(sourceText, start)) {
    const newline = sourceText.indexOf("\n", start + 2);
    return newline < 0 ? sourceText.length : newline;
  }
  const end = sourceText.indexOf("*/", start + 2);
  return end < 0 ? sourceText.length : end + 2;
}

function consumeWhitespace(sourceText, start) {
  let index = start;
  while (index < sourceText.length && isWhitespace(sourceText[index])) {
    index += 1;
  }
  return index;
}

function consumeIdentifier(sourceText, start) {
  let index = start + 1;
  while (index < sourceText.length && isIdentifierPart(sourceText[index])) {
    index += 1;
  }
  return index;
}

function skipWhitespaceAndComments(sourceText, start, limit) {
  let index = start;
  while (index < limit) {
    if (isWhitespace(sourceText[index])) {
      index = consumeWhitespace(sourceText, index);
    } else if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
    } else {
      break;
    }
  }
  return index;
}

function findClassOrInterfaceKeyword(sourceText, start, end) {
  let index = start;
  while (index < end) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }
    if (hasKeywordAt(sourceText, index, "class")) {
      return { keyword: "class", index };
    }
    if (hasKeywordAt(sourceText, index, "interface")) {
      return { keyword: "interface", index };
    }
    index += 1;
  }
  return undefined;
}

function findFirstCodeChar(sourceText, start, end, target) {
  let index = start;
  while (index < end) {
    if (startsLineComment(sourceText, index) || startsBlockComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "`") {
      index = consumeTemplateLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === target) {
      return index;
    }
    index += 1;
  }
  return -1;
}

function findMatchingBrace(sourceText, openIndex, limit) {
  const end = consumeBalancedBlock(sourceText, openIndex, limit);
  return end <= limit && sourceText[end - 1] === "}" ? end - 1 : -1;
}

function addFeature(features, seen, feature) {
  const key = `${feature.kind}:${feature.start}:${feature.end}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  features.push(feature);
}

function createSliceRecord(prefix, kind, start, end, sourceText) {
  return {
    id: `${prefix}:${kind}:${start}:${end}`,
    kind,
    start,
    end,
    text: sourceText.slice(start, end)
  };
}

function summarizeFeatures(features) {
  const summary = {};
  for (const feature of features) {
    summary[feature.kind] = (summary[feature.kind] ?? 0) + 1;
  }
  return summary;
}

function findFirstDifference(sourceText, reconstructedText) {
  const max = Math.max(sourceText.length, reconstructedText.length);
  for (let offset = 0; offset < max; offset += 1) {
    if (sourceText[offset] !== reconstructedText[offset]) {
      const start = Math.max(0, offset - 20);
      const end = offset + 21;
      return {
        offset,
        sourceChar: sourceText[offset] ?? "",
        reconstructedChar: reconstructedText[offset] ?? "",
        sourceCode: sourceText[offset] === undefined ? null : sourceText.charCodeAt(offset),
        reconstructedCode: reconstructedText[offset] === undefined ? null : reconstructedText.charCodeAt(offset),
        sourcePreview: sourceText.slice(start, end),
        reconstructedPreview: reconstructedText.slice(start, end)
      };
    }
  }
  return undefined;
}

function getSourceText(input) {
  if (typeof input === "string") {
    return input;
  }
  return input?.sourceText ?? input?.text ?? "";
}

function getInputValue(input, key) {
  if (!input || typeof input === "string") {
    return undefined;
  }
  return input[key];
}

function hasKeywordAt(sourceText, index, keyword) {
  return sourceText.startsWith(keyword, index) &&
    !isIdentifierPart(sourceText[index - 1]) &&
    !isIdentifierPart(sourceText[index + keyword.length]);
}

function startsLineComment(sourceText, index) {
  return sourceText[index] === "/" && sourceText[index + 1] === "/";
}

function startsBlockComment(sourceText, index) {
  return sourceText[index] === "/" && sourceText[index + 1] === "*";
}

function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f" || char === "\v";
}

function isIdentifierStart(char) {
  return typeof char === "string" && /[A-Za-z_$]/.test(char);
}

function isIdentifierPart(char) {
  return typeof char === "string" && /[A-Za-z0-9_$]/.test(char);
}
