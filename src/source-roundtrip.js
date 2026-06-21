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
const LOSSY_FEATURE_KINDS = new Set(["jsxishText", "malformedSnippet", "staleSnippet"]);

export function scanSourceRoundtrip(input) {
  const sourceText = getSourceText(input);
  const path = getInputValue(input, "path");
  const language = getInputValue(input, "language");
  const id = getInputValue(input, "id") ?? `source-roundtrip-scan:${path ?? "inline"}`;
  const sourceHash = getInputValue(input, "sourceHash") ?? hashSemanticValue(sourceText);
  const segments = scanSegments(sourceText);
  const features = collectSourceRoundtripFeatures(sourceText);
  const diagnostics = collectSourceRoundtripDiagnostics(sourceText, features);
  const featureSummary = summarizeFeatures(features);
  const featureMetadata = summarizeFeatureMetadata(features, diagnostics);

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
    featureSummary,
    featureMetadata,
    diagnostics,
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
  const featureSummary = scan.featureSummary ?? summarizeFeatures(scan.features ?? []);
  const featureMetadata = scan.featureMetadata ?? summarizeFeatureMetadata(scan.features ?? [], scan.diagnostics ?? []);
  const diagnostics = scan.diagnostics ?? [];

  if (firstDifference) {
    issues.push(`No-op source roundtrip changed ${scan.path ?? "inline source"} at offset ${firstDifference.offset}`);
  }

  const status = issues.length === 0 ? "passed" : "failed";
  const classification = classifyNoopSourceRoundtrip({
    status,
    firstDifference,
    featureSummary,
    featureMetadata,
    diagnostics
  });
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
    featureSummary,
    featureMetadata,
    diagnostics,
    classification: classification.classification,
    classificationReasons: classification.reasons,
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
    featureSummary,
    featureMetadata,
    diagnostics,
    classification: classification.classification,
    classificationReasons: classification.reasons,
    ...(firstDifference ? { firstDifference } : {}),
    evidence: {
      id: evidenceId,
      kind: "test",
      status,
      path: scan.path,
      summary: summarizeEvidenceStatus(scan, status, classification),
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
    } else if (sourceText[index] === "@" && isIdentifierStart(sourceText[index + 1])) {
      index = consumeDecorator(sourceText, index);
      kind = "decorator";
    } else if (looksLikeJsxishAt(sourceText, index)) {
      index = consumeJsxishText(sourceText, index);
      kind = "jsxishText";
    } else if (hasKeywordAt(sourceText, index, "import")) {
      index = consumeStatement(sourceText, index);
      kind = "importDeclaration";
    } else if (hasKeywordAt(sourceText, index, "export")) {
      index = consumeExportDeclaration(sourceText, index);
      kind = "exportDeclaration";
    } else if (hasKeywordAt(sourceText, index, "class")) {
      index = consumeDeclarationLike(sourceText, index);
      kind = "classDeclaration";
    } else if (hasKeywordAt(sourceText, index, "function")) {
      index = consumeDeclarationLike(sourceText, index);
      kind = "functionDeclaration";
    } else if (hasKeywordAt(sourceText, index, "interface")) {
      index = consumeDeclarationLike(sourceText, index);
      kind = "interfaceDeclaration";
    } else if (isTypeAliasAt(sourceText, index)) {
      index = consumeDeclarationLike(sourceText, index);
      kind = "typeAliasDeclaration";
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
  collectObjectFeatures(sourceText, features, seen);
  collectJsxishFeatures(sourceText, features, seen);
  collectStaleSnippetFeatures(sourceText, features, seen);
  collectMalformedSnippetFeatures(sourceText, features, seen);
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
    } else if (sourceText[index] === "@" && isIdentifierStart(sourceText[index + 1])) {
      index = consumeDecorator(sourceText, index);
      addFeature(features, seen, createSliceRecord("feature", "decorator", start, index, sourceText));
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

    if (hasKeywordAt(sourceText, index, "class") ||
      hasKeywordAt(sourceText, index, "function") ||
      hasKeywordAt(sourceText, index, "interface") ||
      isTypeAliasAt(sourceText, index)) {
      const declarationKind = declarationKindAt(sourceText, index);
      const end = consumeDeclarationLike(sourceText, index);
      const declarationFeature = createSliceRecord("feature", declarationKind, index, end, sourceText);
      addFeature(features, seen, declarationFeature);
      if (declarationKind === "functionDeclaration" && isOverloadLikeDeclaration(sourceText, index, end)) {
        addFeature(features, seen, {
          ...createSliceRecord("feature", "overloadDeclaration", index, end, sourceText),
          parentId: declarationFeature.id
        });
      }
      if (declarationKind === "classDeclaration" || declarationKind === "interfaceDeclaration") {
        collectMemberFeatures(sourceText, index, end, declarationKind, declarationFeature.id, features, seen);
      }
      index = end;
      continue;
    }

    index += 1;
  }
}

function collectNestedDeclarationFeature(sourceText, start, end, parentId, features, seen) {
  const nested = findDeclarationKeyword(sourceText, start, end);
  if (!nested) {
    return;
  }
  const declarationEnd = consumeDeclarationLike(sourceText, nested.index);
  const boundedEnd = Math.min(declarationEnd, end);
  const declarationKind = declarationKindForKeyword(nested.keyword);
  const declarationFeature = {
    ...createSliceRecord("feature", declarationKind, nested.index, boundedEnd, sourceText),
    parentId
  };
  addFeature(features, seen, declarationFeature);
  if (declarationKind === "functionDeclaration" && isOverloadLikeDeclaration(sourceText, nested.index, boundedEnd)) {
    addFeature(features, seen, {
      ...createSliceRecord("feature", "overloadDeclaration", nested.index, boundedEnd, sourceText),
      parentId: declarationFeature.id
    });
  }
  if (declarationKind === "classDeclaration" || declarationKind === "interfaceDeclaration") {
    collectMemberFeatures(sourceText, nested.index, boundedEnd, declarationKind, declarationFeature.id, features, seen);
  }
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
    if (word === "type") {
      const afterType = skipWhitespaceAndComments(sourceText, end, sourceText.length);
      if (sourceText[afterType] === "{") {
        return "{";
      }
    }
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

function consumeDecorator(sourceText, start) {
  let index = start + 1;
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
    if ((char === "\n" || char === "\r" || char === ";") &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      braceDepth === 0) {
      return index;
    }
    if (char === "(") parenDepth += 1;
    else if (char === ")" && parenDepth > 0) parenDepth -= 1;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]" && bracketDepth > 0) bracketDepth -= 1;
    else if (char === "{") braceDepth += 1;
    else if (char === "}" && braceDepth > 0) braceDepth -= 1;
    index += 1;
  }

  return sourceText.length;
}

function consumeJsxishText(sourceText, start) {
  const tagName = readJsxTagName(sourceText, start);
  const openEnd = findJsxTagEnd(sourceText, start);
  if (!tagName || openEnd < 0) {
    return start + 1;
  }
  const beforeOpenEnd = previousNonWhitespaceIndex(sourceText, openEnd);
  if (sourceText[beforeOpenEnd] === "/") {
    return openEnd + 1;
  }

  const closeStart = sourceText.indexOf(`</${tagName}`, openEnd + 1);
  if (closeStart < 0) {
    return openEnd + 1;
  }
  const closeEnd = findJsxTagEnd(sourceText, closeStart);
  return closeEnd < 0 ? openEnd + 1 : closeEnd + 1;
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

function findDeclarationKeyword(sourceText, start, end) {
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
    if (hasKeywordAt(sourceText, index, "function")) {
      return { keyword: "function", index };
    }
    if (hasKeywordAt(sourceText, index, "interface")) {
      return { keyword: "interface", index };
    }
    if (isTypeAliasAt(sourceText, index)) {
      return { keyword: "type", index };
    }
    index += 1;
  }
  return undefined;
}

function collectObjectFeatures(sourceText, features, seen) {
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
    if (looksLikeJsxishAt(sourceText, index)) {
      index = consumeJsxishText(sourceText, index);
      continue;
    }

    if (sourceText[index] === "{" && looksLikeObjectLiteralAt(sourceText, index)) {
      const end = consumeBalancedBlock(sourceText, index, sourceText.length);
      addFeature(features, seen, createSliceRecord("feature", "objectLiteral", index, end, sourceText));
      index = Math.max(end, index + 1);
      continue;
    }
    index += 1;
  }
}

function collectJsxishFeatures(sourceText, features, seen) {
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
    if (looksLikeJsxishAt(sourceText, index)) {
      const end = consumeJsxishText(sourceText, index);
      addFeature(features, seen, createSliceRecord("feature", "jsxishText", index, end, sourceText));
      index = Math.max(end, index + 1);
      continue;
    }
    index += 1;
  }
}

function collectStaleSnippetFeatures(sourceText, features, seen) {
  const markerPattern = /^(?:(?:<<<<<<<|=======|>>>>>>>)[^\n\r]*|\/\/\s*stale-conflict-marker:[^\n\r]*)/gm;
  let match;
  while ((match = markerPattern.exec(sourceText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    addFeature(features, seen, {
      ...createSliceRecord("feature", "staleSnippet", start, end, sourceText),
      metadata: { reason: "conflict-marker" }
    });
  }
}

function collectMalformedSnippetFeatures(sourceText, features, seen) {
  const stack = [];
  let index = 0;

  while (index < sourceText.length) {
    if (startsBlockComment(sourceText, index)) {
      const end = consumeComment(sourceText, index);
      if (!isClosedBlockComment(sourceText, end)) {
        addMalformedFeature(features, seen, index, end, sourceText, "unterminated-block-comment");
      }
      index = end;
      continue;
    }
    if (startsLineComment(sourceText, index)) {
      index = consumeComment(sourceText, index);
      continue;
    }
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      const end = consumeQuotedLiteral(sourceText, index);
      if (!isClosedQuotedLiteral(sourceText, index, end)) {
        addMalformedFeature(features, seen, index, end, sourceText, "unterminated-string");
      }
      index = end;
      continue;
    }
    if (sourceText[index] === "`") {
      const end = consumeTemplateLiteral(sourceText, index);
      if (!isClosedTemplateLiteral(sourceText, end)) {
        addMalformedFeature(features, seen, index, end, sourceText, "unterminated-template");
      }
      index = end;
      continue;
    }

    const char = sourceText[index];
    if (char === "{" || char === "[" || char === "(") {
      stack.push({ char, index });
    } else if (char === "}" || char === "]" || char === ")") {
      const last = stack[stack.length - 1];
      if (last && matchingClose(last.char) === char) {
        stack.pop();
      } else {
        addMalformedFeature(features, seen, index, index + 1, sourceText, `unmatched-${char}`);
      }
    }
    index += 1;
  }

  for (const open of stack) {
    addMalformedFeature(features, seen, open.index, sourceText.length, sourceText, `unclosed-${open.char}`);
  }
}

function addMalformedFeature(features, seen, start, end, sourceText, reason) {
  addFeature(features, seen, {
    ...createSliceRecord("feature", "malformedSnippet", start, end, sourceText),
    metadata: { reason }
  });
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

function collectSourceRoundtripDiagnostics(sourceText, features) {
  const diagnostics = [];
  for (const feature of features) {
    if (feature.kind === "malformedSnippet") {
      diagnostics.push(createSourceRoundtripDiagnostic(
        "malformed",
        "warning",
        feature,
        `Source snippet is structurally incomplete near offset ${feature.start}; roundtrip is byte-preserving but syntax metadata is lossy.`
      ));
    } else if (feature.kind === "staleSnippet") {
      diagnostics.push(createSourceRoundtripDiagnostic(
        "stale",
        "warning",
        feature,
        `Source snippet contains a stale/conflict marker near offset ${feature.start}; roundtrip is byte-preserving but semantic metadata is lossy.`
      ));
    } else if (feature.kind === "jsxishText") {
      diagnostics.push(createSourceRoundtripDiagnostic(
        "jsxish",
        "info",
        feature,
        `JSX-like source text was preserved as text near offset ${feature.start}.`
      ));
    }
  }
  if (sourceText.length === 0) {
    diagnostics.push({
      id: "diagnostic:empty-source:0:0",
      kind: "emptySource",
      severity: "info",
      message: "Source snippet is empty.",
      start: 0,
      end: 0
    });
  }
  return diagnostics;
}

function createSourceRoundtripDiagnostic(kind, severity, feature, message) {
  return {
    id: `diagnostic:${kind}:${feature.start}:${feature.end}`,
    kind,
    severity,
    message,
    start: feature.start,
    end: feature.end,
    featureId: feature.id
  };
}

function summarizeFeatureMetadata(features, diagnostics) {
  const featureSummary = summarizeFeatures(features);
  const featureKinds = Object.keys(featureSummary).sort();
  const lossyFeatureKinds = featureKinds.filter((kind) => LOSSY_FEATURE_KINDS.has(kind));
  const diagnosticKinds = Array.from(new Set(diagnostics.map((diagnostic) => diagnostic.kind))).sort();
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  return {
    featureKinds,
    lossyFeatureKinds,
    diagnosticKinds,
    diagnosticCount: diagnostics.length,
    warningCount,
    syntaxBalanced: (featureSummary.malformedSnippet ?? 0) === 0,
    staleMarkerCount: featureSummary.staleSnippet ?? 0,
    sourceBytePreservation: "segment-complete"
  };
}

function classifyNoopSourceRoundtrip(input) {
  if (input.status === "failed") {
    return {
      classification: "failed",
      reasons: [
        input.firstDifference
          ? `Reconstructed source first differed at offset ${input.firstDifference.offset}.`
          : "Reconstructed source differed from the source."
      ]
    };
  }

  const reasons = [];
  const lossyFeatureKinds = input.featureMetadata.lossyFeatureKinds ?? [];
  if (lossyFeatureKinds.length > 0) {
    reasons.push(`Scanner preserved bytes but marked lossy feature kinds: ${lossyFeatureKinds.join(", ")}.`);
  }
  for (const diagnostic of input.diagnostics) {
    if (diagnostic.severity === "warning") {
      reasons.push(diagnostic.message);
    }
  }

  if (reasons.length > 0) {
    return {
      classification: "lossy",
      reasons: uniqueStrings(reasons)
    };
  }

  return {
    classification: "safe",
    reasons: [
      `Source segments reconstruct exactly with ${input.featureMetadata.featureKinds.length} feature kinds summarized.`
    ]
  };
}

function summarizeEvidenceStatus(scan, status, classification) {
  const sourceLabel = scan.path ?? "inline source";
  if (status === "failed") {
    return `No-op source roundtrip changed ${sourceLabel}.`;
  }
  if (classification.classification === "lossy") {
    return `No-op source roundtrip preserved ${sourceLabel} with lossy feature metadata.`;
  }
  return `No-op source roundtrip preserved ${sourceLabel}.`;
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

function declarationKindAt(sourceText, index) {
  if (hasKeywordAt(sourceText, index, "class")) {
    return "classDeclaration";
  }
  if (hasKeywordAt(sourceText, index, "function")) {
    return "functionDeclaration";
  }
  if (hasKeywordAt(sourceText, index, "interface")) {
    return "interfaceDeclaration";
  }
  return "typeAliasDeclaration";
}

function declarationKindForKeyword(keyword) {
  if (keyword === "class") {
    return "classDeclaration";
  }
  if (keyword === "function") {
    return "functionDeclaration";
  }
  if (keyword === "interface") {
    return "interfaceDeclaration";
  }
  return "typeAliasDeclaration";
}

function isTypeAliasAt(sourceText, index) {
  if (!hasKeywordAt(sourceText, index, "type")) {
    return false;
  }
  let cursor = skipWhitespaceAndComments(sourceText, index + "type".length, sourceText.length);
  if (!isIdentifierStart(sourceText[cursor])) {
    return false;
  }
  cursor = consumeIdentifier(sourceText, cursor);

  let angleDepth = 0;
  while (cursor < sourceText.length) {
    if (startsLineComment(sourceText, cursor) || startsBlockComment(sourceText, cursor)) {
      cursor = consumeComment(sourceText, cursor);
      continue;
    }
    if (sourceText[cursor] === "\"" || sourceText[cursor] === "'") {
      cursor = consumeQuotedLiteral(sourceText, cursor);
      continue;
    }
    if (sourceText[cursor] === "`") {
      cursor = consumeTemplateLiteral(sourceText, cursor);
      continue;
    }

    const char = sourceText[cursor];
    if (char === "<") angleDepth += 1;
    else if (char === ">" && angleDepth > 0) angleDepth -= 1;
    else if (char === "=" && angleDepth === 0) return true;
    else if ((char === ":" || char === ";" || char === "{") && angleDepth === 0) return false;
    cursor += 1;
  }

  return false;
}

function isOverloadLikeDeclaration(sourceText, start, end) {
  const text = sourceText.slice(start, end).trimEnd();
  return text.endsWith(";") && !text.includes("{");
}

function looksLikeObjectLiteralAt(sourceText, index) {
  const previous = previousSignificantToken(sourceText, index);
  if (!previous) {
    return false;
  }
  if (["=", "(", "[", ",", ":", "?"].includes(previous.char)) {
    return true;
  }
  return previous.word === "return" || previous.word === "yield";
}

function looksLikeJsxishAt(sourceText, index) {
  if (sourceText[index] !== "<") {
    return false;
  }
  const tagName = readJsxTagName(sourceText, index);
  if (!tagName) {
    return false;
  }
  const previous = previousSignificantToken(sourceText, index);
  if (previous &&
    !["=", "(", "[", ",", ":", "?", ">"].includes(previous.char) &&
    previous.word !== "return" &&
    previous.word !== "yield") {
    return false;
  }
  const openEnd = findJsxTagEnd(sourceText, index);
  if (openEnd < 0) {
    return false;
  }
  const beforeOpenEnd = previousNonWhitespaceIndex(sourceText, openEnd);
  if (sourceText[beforeOpenEnd] === "/") {
    return true;
  }
  return sourceText.indexOf(`</${tagName}`, openEnd + 1) >= 0;
}

function readJsxTagName(sourceText, start) {
  let index = start + 1;
  if (sourceText[index] === "/") {
    index += 1;
  }
  if (!isIdentifierStart(sourceText[index])) {
    return "";
  }
  const nameStart = index;
  index += 1;
  while (index < sourceText.length &&
    (isIdentifierPart(sourceText[index]) || sourceText[index] === "." || sourceText[index] === "-")) {
    index += 1;
  }
  return sourceText.slice(nameStart, index);
}

function findJsxTagEnd(sourceText, start) {
  let index = start + 1;
  while (index < sourceText.length) {
    if (sourceText[index] === "\"" || sourceText[index] === "'") {
      index = consumeQuotedLiteral(sourceText, index);
      continue;
    }
    if (sourceText[index] === "{") {
      index = consumeBalancedBlock(sourceText, index, sourceText.length);
      continue;
    }
    if (sourceText[index] === ">") {
      return index;
    }
    index += 1;
  }
  return -1;
}

function previousSignificantToken(sourceText, index) {
  let cursor = previousNonWhitespaceIndex(sourceText, index);
  if (cursor < 0) {
    return undefined;
  }
  const char = sourceText[cursor];
  if (!isIdentifierPart(char)) {
    return { char, index: cursor };
  }
  const end = cursor + 1;
  while (cursor >= 0 && isIdentifierPart(sourceText[cursor])) {
    cursor -= 1;
  }
  const start = cursor + 1;
  return {
    char: sourceText[end - 1],
    word: sourceText.slice(start, end),
    index: start
  };
}

function previousNonWhitespaceIndex(sourceText, index) {
  let cursor = index - 1;
  while (cursor >= 0 && isWhitespace(sourceText[cursor])) {
    cursor -= 1;
  }
  return cursor;
}

function isClosedBlockComment(sourceText, end) {
  return sourceText.slice(end - 2, end) === "*/";
}

function isClosedQuotedLiteral(sourceText, start, end) {
  return end > start && sourceText[end - 1] === sourceText[start];
}

function isClosedTemplateLiteral(sourceText, end) {
  return sourceText[end - 1] === "`";
}

function matchingClose(char) {
  if (char === "{") return "}";
  if (char === "[") return "]";
  return ")";
}

function uniqueStrings(values) {
  return Array.from(new Set(values));
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
