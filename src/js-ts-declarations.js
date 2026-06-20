import { hashSemanticValue } from "./hashing.js";
import { ordinalCompare, unique } from "./shared.js";

const DECLARATION_KEYWORDS = new Set(["function", "class", "interface", "type", "enum", "const", "let", "var"]);
const DECLARATION_MODIFIERS = new Set(["abstract", "async", "declare"]);
const VARIABLE_DECLARATION_KEYWORDS = new Set(["const", "let", "var"]);
const IDENTIFIER_PATTERN = /^[$_A-Za-z][$_0-9A-Za-z]*$/;

export const JS_TS_TOP_LEVEL_DECLARATION_MERGE_CLASSIFICATIONS = Object.freeze([
  "unchanged",
  "safe-add",
  "safe-by-merge-law",
  "conflict"
]);

export function collectTopLevelJsTsDeclarations(sourceText, options = {}) {
  const source = typeof sourceText === "string" ? sourceText : "";
  const masked = maskJsTsCommentsAndStrings(source);
  const tokens = tokenizeJsTsSource(masked);
  const lineStarts = collectLineStarts(source);
  const declarations = [];
  let braceDepth = 0;
  let tokenIndex = 0;

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (token.value === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      tokenIndex += 1;
      continue;
    }

    if (braceDepth === 0) {
      const parsed = parseTopLevelDeclaration(tokens, tokenIndex, source, masked, lineStarts, options);
      if (parsed) {
        declarations.push(parsed.declaration);
        tokenIndex = parsed.nextTokenIndex;
        continue;
      }
    }

    if (token.value === "{") {
      braceDepth += 1;
    }
    tokenIndex += 1;
  }

  return declarations.sort((left, right) =>
    (left.span?.start ?? 0) - (right.span?.start ?? 0) ||
    ordinalCompare(left.identityKey, right.identityKey)
  );
}

export function topLevelJsTsDeclarationIdentityKey(input, options = {}) {
  const sourcePath = input?.sourcePath ?? options.sourcePath;
  const scope = declarationScope(sourcePath);
  const kind = input?.declarationKind ?? "declaration";
  const names = input?.names?.length ? input.names : input?.name ? [input.name] : [];
  if (input?.defaultExport && names.length === 0) {
    return defaultDeclarationKey(scope);
  }
  const namePart = names.length > 0 ? names.join(",") : "anonymous";
  return `jsts-declaration:${scope}:${declarationKeyPart(kind)}:${declarationKeyPart(namePart)}`;
}

export function classifyTopLevelJsTsDeclarationMerge(input, options = {}) {
  const normalized = normalizeDeclarationMergeInput(input, options);
  const baseDeclarations = normalized.baseDeclarations ?? collectTopLevelJsTsDeclarations(normalized.baseSource, normalized);
  const leftDeclarations = normalized.leftDeclarations ?? collectTopLevelJsTsDeclarations(normalized.leftSource, normalized);
  const rightDeclarations = normalized.rightDeclarations ?? collectTopLevelJsTsDeclarations(normalized.rightSource, normalized);
  const baseByKey = groupDeclarationsByKey(baseDeclarations);
  const leftByKey = groupDeclarationsByKey(leftDeclarations);
  const rightByKey = groupDeclarationsByKey(rightDeclarations);
  const declarationKeys = unique([
    ...baseByKey.keys(),
    ...leftByKey.keys(),
    ...rightByKey.keys()
  ]).sort(ordinalCompare);
  const safeAdds = [];
  const safeByMergeLaw = [];
  const conflicts = [];

  for (const declarationKey of declarationKeys) {
    const baseEntries = baseByKey.get(declarationKey) ?? [];
    const leftEntries = leftByKey.get(declarationKey) ?? [];
    const rightEntries = rightByKey.get(declarationKey) ?? [];
    const baseFingerprint = declarationsFingerprint(baseEntries);
    const leftFingerprint = declarationsFingerprint(leftEntries);
    const rightFingerprint = declarationsFingerprint(rightEntries);
    const leftChanged = leftFingerprint !== baseFingerprint;
    const rightChanged = rightFingerprint !== baseFingerprint;
    if (!leftChanged && !rightChanged) {
      continue;
    }

    const side = leftChanged && rightChanged ? "both" : leftChanged ? "left" : "right";
    const changeKind = declarationChangeKind(baseEntries, leftChanged ? leftEntries : rightEntries);
    const law = findDeclarationMergeLaw(declarationKey, {
      baseDeclarations: baseEntries,
      leftDeclarations: leftEntries,
      rightDeclarations: rightEntries,
      side,
      changeKind
    }, normalized.mergeLaws);
    if (law) {
      safeByMergeLaw.push(createDeclarationClassification({
        declarationKey,
        classification: "safe-by-merge-law",
        side,
        changeKind,
        baseDeclarations: baseEntries,
        leftDeclarations: leftEntries,
        rightDeclarations: rightEntries,
        mergeLaw: law,
        reasons: [`Declaration key ${declarationKey} is covered by an explicit merge law.`]
      }));
      continue;
    }

    if (baseEntries.length === 0 && side !== "both" && (leftEntries.length > 0 || rightEntries.length > 0)) {
      safeAdds.push(createDeclarationClassification({
        declarationKey,
        classification: "safe-add",
        side,
        changeKind: "add",
        baseDeclarations: baseEntries,
        leftDeclarations: leftEntries,
        rightDeclarations: rightEntries,
        reasons: [`Declaration key ${declarationKey} is a new top-level declaration on one side only.`]
      }));
      continue;
    }

    conflicts.push(createDeclarationClassification({
      declarationKey,
      classification: "conflict",
      side,
      changeKind,
      baseDeclarations: baseEntries,
      leftDeclarations: leftEntries,
      rightDeclarations: rightEntries,
      reasons: declarationConflictReasons(declarationKey, baseEntries, leftEntries, rightEntries, side, changeKind)
    }));
  }

  const classification = conflicts.length > 0
    ? "conflict"
    : safeAdds.length > 0
      ? "safe-add"
      : safeByMergeLaw.length > 0
        ? "safe-by-merge-law"
        : "unchanged";

  return {
    kind: "frontier.lang.jsTsTopLevelDeclarationMergeAdmission",
    version: 1,
    id: normalized.id ?? "jsts-top-level-declaration-merge",
    classification,
    autoMergeable: conflicts.length === 0,
    declarationKeys,
    safeAdds,
    safeByMergeLaw,
    conflicts,
    declarations: {
      base: baseDeclarations,
      left: leftDeclarations,
      right: rightDeclarations
    },
    metadata: {
      sourcePath: normalized.sourcePath,
      language: normalized.language,
      mergeLawCount: normalized.mergeLaws.length,
      ...(normalized.metadata ?? {})
    }
  };
}

function parseTopLevelDeclaration(tokens, tokenIndex, source, masked, lineStarts, options) {
  const lead = readDeclarationLead(tokens, tokenIndex);
  if (!lead) {
    return undefined;
  }

  if (lead.kind === "default-expression") {
    const end = findStatementEnd(masked, tokens[lead.startTokenIndex].start);
    return createParsedDeclaration({
      source,
      masked,
      lineStarts,
      options,
      start: tokens[lead.startTokenIndex].start,
      end,
      declarationKind: "default",
      exportKind: "default",
      defaultExport: true,
      modifiers: lead.modifiers,
      names: [],
      name: undefined,
      nextTokenIndex: firstTokenAtOrAfter(tokens, tokenIndex + 1, end)
    });
  }

  const keyword = tokens[lead.keywordTokenIndex]?.value;
  if (!DECLARATION_KEYWORDS.has(keyword)) {
    return undefined;
  }
  if (keyword === "type" && tokens[lead.keywordTokenIndex + 1]?.value === "{") {
    return undefined;
  }

  const declarationStart = tokens[lead.startTokenIndex].start;
  const declarationEnd = VARIABLE_DECLARATION_KEYWORDS.has(keyword) || keyword === "type"
    ? findStatementEnd(masked, declarationStart)
    : findBlockOrStatementEnd(masked, tokens[lead.keywordTokenIndex].start);
  const nextTokenIndex = firstTokenAtOrAfter(tokens, tokenIndex + 1, declarationEnd);

  if (VARIABLE_DECLARATION_KEYWORDS.has(keyword)) {
    const names = collectVariableDeclarationNames(tokens, lead.keywordTokenIndex + 1, declarationEnd);
    if (names.length === 0) {
      return undefined;
    }
    return createParsedDeclaration({
      source,
      masked,
      lineStarts,
      options,
      start: declarationStart,
      end: declarationEnd,
      declarationKind: "variable",
      variableKind: keyword,
      exportKind: lead.defaultExport ? "default" : lead.exported ? "named" : "none",
      defaultExport: lead.defaultExport,
      modifiers: lead.modifiers,
      names,
      name: names.join(","),
      nextTokenIndex
    });
  }

  const name = readDeclarationName(tokens, lead.keywordTokenIndex, keyword, lead.defaultExport);
  if (!name && !lead.defaultExport) {
    return undefined;
  }

  return createParsedDeclaration({
    source,
    masked,
    lineStarts,
    options,
    start: declarationStart,
    end: declarationEnd,
    declarationKind: keyword,
    exportKind: lead.defaultExport ? "default" : lead.exported ? "named" : "none",
    defaultExport: lead.defaultExport,
    modifiers: lead.modifiers,
    names: name && name !== "default" ? [name] : [],
    name,
    nextTokenIndex
  });
}

function readDeclarationLead(tokens, tokenIndex) {
  let cursor = tokenIndex;
  let exported = false;
  let defaultExport = false;
  const modifiers = [];
  const startTokenIndex = tokenIndex;

  if (tokens[cursor]?.value === "export") {
    exported = true;
    cursor += 1;
    if (tokens[cursor]?.value === "default") {
      defaultExport = true;
      cursor += 1;
    }
  }

  while (DECLARATION_MODIFIERS.has(tokens[cursor]?.value)) {
    modifiers.push(tokens[cursor].value);
    cursor += 1;
  }

  if (DECLARATION_KEYWORDS.has(tokens[cursor]?.value)) {
    return {
      kind: "declaration",
      startTokenIndex,
      keywordTokenIndex: cursor,
      exported,
      defaultExport,
      modifiers
    };
  }

  if (exported && defaultExport) {
    return {
      kind: "default-expression",
      startTokenIndex,
      keywordTokenIndex: cursor,
      exported,
      defaultExport,
      modifiers
    };
  }

  return undefined;
}

function createParsedDeclaration(input) {
  const text = input.source.slice(input.start, input.end);
  const normalizedText = normalizeDeclarationText(text);
  const span = sourceSpanForRange(input.start, input.end, input.lineStarts, input.options.sourcePath);
  const scope = declarationScope(input.options.sourcePath);
  const declarationKeys = createDeclarationKeys({
    scope,
    names: input.names,
    defaultExport: input.defaultExport
  });
  const identityKey = topLevelJsTsDeclarationIdentityKey({
    declarationKind: input.declarationKind,
    variableKind: input.variableKind,
    name: input.name,
    names: input.names,
    defaultExport: input.defaultExport,
    sourcePath: input.options.sourcePath
  });

  return {
    declaration: {
      kind: "frontier.lang.jsTsTopLevelDeclaration",
      version: 1,
      id: `${identityKey}@${span.startLine ?? 1}:${span.startColumn ?? 1}`,
      declarationKind: input.declarationKind,
      variableKind: input.variableKind,
      name: input.name,
      names: input.names,
      exportKind: input.exportKind,
      defaultExport: input.defaultExport,
      modifiers: input.modifiers,
      identityKey,
      declarationKeys,
      conflictKeys: declarationKeys,
      contentHash: hashSemanticValue({
        declarationKind: input.declarationKind,
        variableKind: input.variableKind,
        text: normalizedText
      }),
      span,
      text,
      normalizedText,
      metadata: declarationMetadata(input.options)
    },
    nextTokenIndex: input.nextTokenIndex
  };
}

function readDeclarationName(tokens, keywordTokenIndex, keyword, defaultExport) {
  let cursor = keywordTokenIndex + 1;
  if (keyword === "function" && tokens[cursor]?.value === "*") {
    cursor += 1;
  }
  if (isIdentifierToken(tokens[cursor])) {
    return tokens[cursor].value;
  }
  return defaultExport ? "default" : undefined;
}

function collectVariableDeclarationNames(tokens, startTokenIndex, end) {
  const names = [];
  let expectName = true;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let index = startTokenIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.start >= end) {
      break;
    }
    if (token.value === "{" && expectName) {
      braceDepth += 1;
      expectName = false;
      continue;
    }
    if (token.value === "[" && expectName) {
      bracketDepth += 1;
      expectName = false;
      continue;
    }
    if (token.value === "{") braceDepth += 1;
    else if (token.value === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (token.value === "[") bracketDepth += 1;
    else if (token.value === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (token.value === "(") parenDepth += 1;
    else if (token.value === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (token.value === "," && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      expectName = true;
      continue;
    }

    if (expectName && isIdentifierToken(token)) {
      names.push(token.value);
      expectName = false;
    }
  }

  return unique(names).sort(ordinalCompare);
}

function findBlockOrStatementEnd(masked, start) {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let sawBodyBrace = false;

  for (let index = start; index < masked.length; index += 1) {
    const char = masked[index];
    if (char === "{") {
      braceDepth += 1;
      sawBodyBrace = true;
    } else if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      if (sawBodyBrace && braceDepth === 0) {
        return index + 1;
      }
    } else if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    } else if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (char === ";" && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return index + 1;
    }
  }

  return masked.length;
}

function findStatementEnd(masked, start) {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let index = start; index < masked.length; index += 1) {
    const char = masked[index];
    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (char === ";" && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return index + 1;
    }
  }

  return masked.length;
}

function maskJsTsCommentsAndStrings(source) {
  const chars = source.split("");
  let index = 0;

  while (index < chars.length) {
    const char = chars[index];
    const next = chars[index + 1];
    if (char === "/" && next === "/") {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 2;
      while (index < chars.length && chars[index] !== "\n") {
        chars[index] = " ";
        index += 1;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 2;
      while (index < chars.length) {
        if (chars[index] === "\n") {
          index += 1;
          continue;
        }
        if (chars[index] === "*" && chars[index + 1] === "/") {
          chars[index] = " ";
          chars[index + 1] = " ";
          index += 2;
          break;
        }
        chars[index] = " ";
        index += 1;
      }
      continue;
    }
    if (char === "'" || char === "\"" || char === "`") {
      const quote = char;
      chars[index] = " ";
      index += 1;
      while (index < chars.length) {
        const current = chars[index];
        if (current === "\n") {
          index += 1;
          continue;
        }
        chars[index] = " ";
        if (current === "\\") {
          if (chars[index + 1] && chars[index + 1] !== "\n") {
            chars[index + 1] = " ";
          }
          index += 2;
          continue;
        }
        index += 1;
        if (current === quote) {
          break;
        }
      }
      continue;
    }
    index += 1;
  }

  return chars.join("");
}

function tokenizeJsTsSource(masked) {
  const tokens = [];
  let index = 0;
  while (index < masked.length) {
    const char = masked[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (index < masked.length && isIdentifierPart(masked[index])) {
        index += 1;
      }
      tokens.push({ type: "identifier", value: masked.slice(start, index), start, end: index });
      continue;
    }
    tokens.push({ type: "punctuator", value: char, start: index, end: index + 1 });
    index += 1;
  }
  return tokens;
}

function createDeclarationKeys(input) {
  const keys = input.names.map((name) => declarationNameKey(input.scope, name));
  if (input.defaultExport) {
    keys.push(defaultDeclarationKey(input.scope));
  }
  return unique(keys).sort(ordinalCompare);
}

function groupDeclarationsByKey(declarations) {
  const byKey = new Map();
  for (const declaration of declarations) {
    for (const declarationKey of declaration.declarationKeys ?? []) {
      const entries = byKey.get(declarationKey) ?? [];
      entries.push(declaration);
      byKey.set(declarationKey, entries);
    }
  }
  return byKey;
}

function declarationsFingerprint(declarations) {
  if (!declarations || declarations.length === 0) {
    return undefined;
  }
  return declarations
    .map((declaration) => `${declaration.identityKey}:${declaration.contentHash}`)
    .sort(ordinalCompare)
    .join("|");
}

function declarationChangeKind(baseDeclarations, changedDeclarations) {
  if (baseDeclarations.length === 0 && changedDeclarations.length > 0) return "add";
  if (baseDeclarations.length > 0 && changedDeclarations.length === 0) return "delete";
  return "edit";
}

function declarationConflictReasons(declarationKey, baseEntries, leftEntries, rightEntries, side, changeKind) {
  if (side === "both") {
    return [`Both sides changed top-level declaration key ${declarationKey}.`];
  }
  if (changeKind === "edit") {
    return [`Top-level declaration key ${declarationKey} edits an existing declaration and needs an explicit merge law.`];
  }
  if (changeKind === "delete") {
    return [`Top-level declaration key ${declarationKey} deletes an existing declaration and needs review.`];
  }
  if (baseEntries.length === 0 && (leftEntries.length > 0 || rightEntries.length > 0)) {
    return [`Top-level declaration key ${declarationKey} is not an independent add.`];
  }
  return [`Top-level declaration key ${declarationKey} needs review.`];
}

function createDeclarationClassification(input) {
  return {
    kind: "frontier.lang.jsTsTopLevelDeclarationMergeClassification",
    version: 1,
    declarationKey: input.declarationKey,
    classification: input.classification,
    side: input.side,
    changeKind: input.changeKind,
    baseDeclarations: input.baseDeclarations,
    leftDeclarations: input.leftDeclarations,
    rightDeclarations: input.rightDeclarations,
    mergeLaw: input.mergeLaw,
    reasons: input.reasons
  };
}

function findDeclarationMergeLaw(declarationKey, context, mergeLaws) {
  for (const mergeLaw of mergeLaws ?? []) {
    if (typeof mergeLaw === "string") {
      if (mergeLaw === declarationKey) {
        return { id: mergeLaw, declarationKey };
      }
      continue;
    }
    if (!mergeLaw || typeof mergeLaw !== "object") {
      continue;
    }
    const lawKeys = [
      mergeLaw.declarationKey,
      ...(Array.isArray(mergeLaw.declarationKeys) ? mergeLaw.declarationKeys : [])
    ].filter(Boolean);
    if (lawKeys.length > 0 && !lawKeys.includes(declarationKey)) {
      continue;
    }
    if (mergeLaw.name) {
      const names = new Set([
        ...context.baseDeclarations.flatMap((declaration) => declaration.names ?? []),
        ...context.leftDeclarations.flatMap((declaration) => declaration.names ?? []),
        ...context.rightDeclarations.flatMap((declaration) => declaration.names ?? [])
      ]);
      if (!names.has(mergeLaw.name)) {
        continue;
      }
    }
    const action = mergeLaw.action ?? mergeLaw.classification ?? "allow";
    if (["allow", "safe", "safe-add", "safe-by-merge-law"].includes(action)) {
      return mergeLaw;
    }
  }
  return undefined;
}

function normalizeDeclarationMergeInput(input, options) {
  const merged = { ...options, ...(input ?? {}) };
  return {
    ...merged,
    baseSource: merged.baseSource ?? merged.base ?? "",
    leftSource: merged.leftSource ?? merged.left ?? "",
    rightSource: merged.rightSource ?? merged.right ?? "",
    mergeLaws: merged.mergeLaws ?? []
  };
}

function declarationMetadata(options) {
  return {
    ...(options.sourcePath ? { sourcePath: options.sourcePath } : {}),
    ...(options.language ? { language: options.language } : {})
  };
}

function firstTokenAtOrAfter(tokens, startTokenIndex, offset) {
  let index = startTokenIndex;
  while (index < tokens.length && tokens[index].start < offset) {
    index += 1;
  }
  return index;
}

function normalizeDeclarationText(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function declarationNameKey(scope, name) {
  return `jsts-declaration:${scope}:name:${declarationKeyPart(name)}`;
}

function defaultDeclarationKey(scope) {
  return `jsts-declaration:${scope}:default`;
}

function declarationScope(sourcePath) {
  return sourcePath ? declarationKeyPart(sourcePath) : "module";
}

function declarationKeyPart(value) {
  if (value === undefined || value === null || value === "") return "unknown";
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ");
}

function collectLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

function sourceSpanForRange(start, end, lineStarts, sourcePath) {
  const startPosition = lineColumnForOffset(start, lineStarts);
  const endPosition = lineColumnForOffset(end, lineStarts);
  return {
    path: sourcePath,
    start,
    end,
    startLine: startPosition.line,
    startColumn: startPosition.column,
    endLine: endPosition.line,
    endColumn: endPosition.column
  };
}

function lineColumnForOffset(offset, lineStarts) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const lineIndex = Math.max(0, high);
  return {
    line: lineIndex + 1,
    column: offset - lineStarts[lineIndex] + 1
  };
}

function isIdentifierStart(char) {
  return /[$_A-Za-z]/.test(char);
}

function isIdentifierPart(char) {
  return /[$_0-9A-Za-z]/.test(char);
}

function isIdentifierToken(token) {
  return token?.type === "identifier" && IDENTIFIER_PATTERN.test(token.value);
}
