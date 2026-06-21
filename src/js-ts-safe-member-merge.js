import { hashSemanticValue } from "./hashing.js";
import { ordinalCompare, unique } from "./shared.js";

export const JS_TS_SAFE_MEMBER_MERGE_CLASSIFICATIONS = Object.freeze([
  "unchanged",
  "safe-member-add",
  "conflict"
]);

const BODY_DECLARATION_KEYWORDS = new Set(["class", "interface", "type", "const", "let", "var"]);
const BODY_DECLARATION_MODIFIERS = new Set(["export", "default", "declare", "abstract"]);
const MEMBER_MODIFIERS = new Set([
  "abstract",
  "accessor",
  "async",
  "declare",
  "override",
  "private",
  "protected",
  "public",
  "readonly",
  "static"
]);
const MEMBER_ACCESSORS = new Set(["get", "set"]);

export function collectJsTsSafeMergeBodies(sourceText, options = {}) {
  const source = typeof sourceText === "string" ? sourceText : "";
  const masked = maskJsTsSafeMergeSource(source);
  const tokens = tokenizeJsTsSafeMergeSource(masked);
  const lineStarts = collectLineStarts(source);
  const bodies = [];
  let tokenIndex = 0;
  let braceDepth = 0;

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (token.value === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      tokenIndex += 1;
      continue;
    }

    if (braceDepth === 0) {
      const parsed = parseSafeMergeBodyAt(tokens, tokenIndex, source, masked, lineStarts, options);
      if (parsed) {
        bodies.push(parsed.body);
        tokenIndex = parsed.nextTokenIndex;
        continue;
      }
    }

    if (token.value === "{") {
      braceDepth += 1;
    }
    tokenIndex += 1;
  }

  return bodies.sort((left, right) =>
    (left.bodySpan?.start ?? 0) - (right.bodySpan?.start ?? 0) ||
    ordinalCompare(left.identityKey, right.identityKey)
  );
}

export function jsTsSafeMemberIdentityKey(input, options = {}) {
  const sourcePath = input?.sourcePath ?? options.sourcePath;
  const scope = sourcePath ? keyPart(sourcePath) : "module";
  const bodyKey = input?.bodyKey ?? input?.ownerBodyKey ?? input?.ownerDeclarationId ?? input?.ownerId ?? "body";
  const name = input?.name ?? input?.memberName ?? "unknown";
  return `jsts-member:${scope}:${keyPart(bodyKey)}:${keyPart(name)}`;
}

export function classifyJsTsSafeMemberMerge(input = {}, options = {}) {
  const normalized = normalizeMemberMergeInput(input, options);
  const baseBodies = normalized.baseBodies ?? collectBodiesForSide("base", normalized);
  const leftBodies = normalized.leftBodies ?? collectBodiesForSide("left", normalized);
  const rightBodies = normalized.rightBodies ?? collectBodiesForSide("right", normalized);
  const baseByKey = groupBodiesByKey(baseBodies);
  const leftByKey = groupBodiesByKey(leftBodies);
  const rightByKey = groupBodiesByKey(rightBodies);
  const bodyKeys = unique([
    ...baseByKey.keys(),
    ...leftByKey.keys(),
    ...rightByKey.keys()
  ]).sort(ordinalCompare);
  const safeAdds = [];
  const conflicts = [];

  for (const bodyKey of bodyKeys) {
    const baseEntries = baseByKey.get(bodyKey) ?? [];
    const leftEntries = leftByKey.get(bodyKey) ?? [];
    const rightEntries = rightByKey.get(bodyKey) ?? [];
    if (baseEntries.length !== 1 || leftEntries.length !== 1 || rightEntries.length !== 1) {
      conflicts.push(createMemberMergeClassification({
        bodyKey,
        classification: "conflict",
        side: changedBodySide(baseEntries, leftEntries, rightEntries),
        changeKind: "span",
        baseBodies: baseEntries,
        leftBodies: leftEntries,
        rightBodies: rightEntries,
        reasons: [`Member body ${bodyKey} is missing or duplicated on at least one side.`]
      }));
      continue;
    }

    const baseBody = baseEntries[0];
    const leftBody = leftEntries[0];
    const rightBody = rightEntries[0];
    if (!hasStableBodySpan(baseBody) || !hasStableBodySpan(leftBody) || !hasStableBodySpan(rightBody)) {
      conflicts.push(createMemberMergeClassification({
        bodyKey,
        classification: "conflict",
        side: changedBodySide(baseEntries, leftEntries, rightEntries),
        changeKind: "span",
        baseBodies: [baseBody],
        leftBodies: [leftBody],
        rightBodies: [rightBody],
        reasons: [`Member body ${bodyKey} is missing numeric body spans.`]
      }));
      continue;
    }
    const baseFingerprint = bodyFingerprint(baseBody);
    const leftFingerprint = bodyFingerprint(leftBody);
    const rightFingerprint = bodyFingerprint(rightBody);
    const leftChanged = leftFingerprint !== baseFingerprint;
    const rightChanged = rightFingerprint !== baseFingerprint;

    if (!leftChanged && !rightChanged) {
      continue;
    }

    if (leftChanged && rightChanged) {
      conflicts.push(createMemberMergeClassification({
        bodyKey,
        classification: "conflict",
        side: "both",
        changeKind: "edit",
        baseBodies: [baseBody],
        leftBodies: [leftBody],
        rightBodies: [rightBody],
        reasons: [`Both sides changed member body ${bodyKey}.`]
      }));
      continue;
    }

    const side = leftChanged ? "left" : "right";
    const changedBody = leftChanged ? leftBody : rightBody;
    const analysis = analyzeOneSidedMemberBodyChange({
      bodyKey,
      side,
      baseBody,
      changedBody,
      leftBody,
      rightBody
    });
    if (analysis.conflicts.length > 0) {
      conflicts.push(...analysis.conflicts);
      continue;
    }
    safeAdds.push(...analysis.safeAdds);
  }

  const outsideConflict = detectOutsideSourceConflict(normalized, safeAdds, conflicts);
  if (outsideConflict) {
    conflicts.push(outsideConflict);
  }

  const classification = conflicts.length > 0
    ? "conflict"
    : safeAdds.length > 0
      ? "safe-member-add"
      : "unchanged";
  const changedSides = unique(safeAdds.map((entry) => entry.side)).sort(ordinalCompare);
  const mergedSource = conflicts.length === 0 && changedSides.length === 1
    ? sourceForSide(normalized, changedSides[0])
    : undefined;

  return {
    kind: "frontier.lang.jsTsSafeMemberMergeAdmission",
    version: 1,
    id: normalized.id ?? "jsts-safe-member-merge",
    classification,
    autoMergeable: conflicts.length === 0,
    mergedSource,
    bodyKeys,
    safeAdds,
    conflicts,
    bodies: {
      base: baseBodies,
      left: leftBodies,
      right: rightBodies
    },
    metadata: {
      sourcePath: normalized.sourcePath,
      language: normalized.language,
      ...(normalized.metadata ?? {})
    }
  };
}

function parseSafeMergeBodyAt(tokens, tokenIndex, source, masked, lineStarts, options) {
  const lead = readBodyLead(tokens, tokenIndex);
  if (!lead || !BODY_DECLARATION_KEYWORDS.has(lead.keyword)) {
    return undefined;
  }

  if (lead.keyword === "class" || lead.keyword === "interface") {
    return parseClassLikeBody(lead, tokens, source, masked, lineStarts, options);
  }
  if (lead.keyword === "type") {
    return parseTypeLiteralBody(lead, tokens, source, masked, lineStarts, options);
  }
  return parseObjectLiteralBody(lead, tokens, source, masked, lineStarts, options);
}

function readBodyLead(tokens, tokenIndex) {
  let cursor = tokenIndex;
  const startTokenIndex = tokenIndex;
  const modifiers = [];
  while (BODY_DECLARATION_MODIFIERS.has(tokens[cursor]?.value)) {
    modifiers.push(tokens[cursor].value);
    cursor += 1;
  }
  const keyword = tokens[cursor]?.value;
  if (!BODY_DECLARATION_KEYWORDS.has(keyword)) {
    return undefined;
  }
  return {
    startTokenIndex,
    keywordTokenIndex: cursor,
    keyword,
    modifiers
  };
}

function parseClassLikeBody(lead, tokens, source, masked, lineStarts, options) {
  const nameToken = nextIdentifierToken(tokens, lead.keywordTokenIndex + 1);
  const name = nameToken?.value ?? (lead.modifiers.includes("default") ? "default" : undefined);
  const openBraceToken = nextTokenValue(tokens, lead.keywordTokenIndex + 1, "{");
  if (!openBraceToken) {
    return undefined;
  }
  const closeBrace = findMatchingBrace(masked, openBraceToken.start);
  if (closeBrace === undefined) {
    return undefined;
  }
  return createParsedBody({
    source,
    masked,
    lineStarts,
    options,
    start: tokens[lead.startTokenIndex].start,
    end: closeBrace + 1,
    bodyStart: openBraceToken.start,
    bodyEnd: closeBrace + 1,
    bodyKind: lead.keyword,
    name,
    modifiers: lead.modifiers,
    nextTokenIndex: firstTokenAtOrAfter(tokens, lead.keywordTokenIndex + 1, closeBrace + 1)
  });
}

function parseTypeLiteralBody(lead, tokens, source, masked, lineStarts, options) {
  const nameToken = nextIdentifierToken(tokens, lead.keywordTokenIndex + 1);
  if (!nameToken) {
    return undefined;
  }
  const equalsToken = nextTokenValue(tokens, lead.keywordTokenIndex + 1, "=");
  if (!equalsToken) {
    return undefined;
  }
  const bodyStart = nextNonWhitespaceOffset(masked, equalsToken.end);
  if (masked[bodyStart] !== "{") {
    return undefined;
  }
  const closeBrace = findMatchingBrace(masked, bodyStart);
  if (closeBrace === undefined) {
    return undefined;
  }
  const end = findStatementEnd(masked, closeBrace + 1);
  return createParsedBody({
    source,
    masked,
    lineStarts,
    options,
    start: tokens[lead.startTokenIndex].start,
    end,
    bodyStart,
    bodyEnd: closeBrace + 1,
    bodyKind: "type",
    name: nameToken.value,
    modifiers: lead.modifiers,
    nextTokenIndex: firstTokenAtOrAfter(tokens, lead.keywordTokenIndex + 1, end)
  });
}

function parseObjectLiteralBody(lead, tokens, source, masked, lineStarts, options) {
  const nameToken = nextIdentifierToken(tokens, lead.keywordTokenIndex + 1);
  if (!nameToken) {
    return undefined;
  }
  const equalsToken = nextTokenValue(tokens, lead.keywordTokenIndex + 1, "=");
  if (!equalsToken) {
    return undefined;
  }
  const bodyStart = nextNonWhitespaceOffset(masked, equalsToken.end);
  if (masked[bodyStart] !== "{") {
    return undefined;
  }
  const closeBrace = findMatchingBrace(masked, bodyStart);
  if (closeBrace === undefined) {
    return undefined;
  }
  const end = findStatementEnd(masked, closeBrace + 1);
  return createParsedBody({
    source,
    masked,
    lineStarts,
    options,
    start: tokens[lead.startTokenIndex].start,
    end,
    bodyStart,
    bodyEnd: closeBrace + 1,
    bodyKind: "object",
    name: nameToken.value,
    modifiers: lead.modifiers,
    nextTokenIndex: firstTokenAtOrAfter(tokens, lead.keywordTokenIndex + 1, end)
  });
}

function createParsedBody(input) {
  const sourceSpan = sourceSpanForRange(input.start, input.end, input.lineStarts, input.options.sourcePath);
  const bodySpan = sourceSpanForRange(input.bodyStart, input.bodyEnd, input.lineStarts, input.options.sourcePath);
  const identityKey = bodyIdentityKey({
    bodyKind: input.bodyKind,
    name: input.name,
    sourcePath: input.options.sourcePath
  });
  const members = collectSafeMergeMembers({
    source: input.source,
    masked: input.masked,
    lineStarts: input.lineStarts,
    sourcePath: input.options.sourcePath,
    bodyKind: input.bodyKind,
    bodyKey: identityKey,
    bodyStart: input.bodyStart,
    bodyEnd: input.bodyEnd
  });
  return {
    body: {
      kind: "frontier.lang.jsTsSafeMergeBody",
      version: 1,
      id: `${identityKey}@${bodySpan.startLine ?? 1}:${bodySpan.startColumn ?? 1}`,
      bodyKind: input.bodyKind,
      name: input.name,
      identityKey,
      conflictKeys: [identityKey],
      sourceSpan,
      bodySpan,
      members,
      contentHash: bodyContentHash(members),
      text: input.source.slice(input.start, input.end),
      metadata: {
        modifiers: input.modifiers
      }
    },
    nextTokenIndex: input.nextTokenIndex
  };
}

function collectSafeMergeMembers(input) {
  const members = [];
  const closeBrace = input.bodyEnd - 1;
  let cursor = input.bodyStart + 1;

  while (cursor < closeBrace) {
    cursor = skipMemberPadding(input.masked, cursor, closeBrace);
    if (cursor >= closeBrace) {
      break;
    }

    const memberStart = cursor;
    const memberEnd = findMemberEnd(input.masked, memberStart, closeBrace);
    if (memberEnd <= memberStart) {
      break;
    }
    const key = parseMemberKey(input.source, input.masked, memberStart, memberEnd, input.bodyKind);
    const sourceSpan = sourceSpanForRange(memberStart, memberEnd, input.lineStarts, input.sourcePath);
    const keySpan = key.start !== undefined && key.end !== undefined
      ? sourceSpanForRange(key.start, key.end, input.lineStarts, input.sourcePath)
      : undefined;
    const normalizedText = normalizeMemberText(input.source.slice(memberStart, memberEnd));
    const memberKey = key.name
      ? jsTsSafeMemberIdentityKey({ bodyKey: input.bodyKey, name: key.name, sourcePath: input.sourcePath })
      : `jsts-member:${keyPart(input.bodyKey)}:unstable:${memberStart}`;
    members.push({
      kind: "frontier.lang.jsTsSafeMergeMember",
      version: 1,
      id: `${memberKey}@${sourceSpan.startLine ?? 1}:${sourceSpan.startColumn ?? 1}`,
      bodyKey: input.bodyKey,
      memberKind: key.memberKind ?? "member",
      name: key.name,
      identityKey: memberKey,
      conflictKeys: [memberKey],
      computed: key.computed,
      stableKey: Boolean(key.name && !key.computed),
      sourceSpan,
      keySpan,
      contentHash: hashSemanticValue({
        memberKind: key.memberKind ?? "member",
        text: normalizedText
      }),
      text: input.source.slice(memberStart, memberEnd),
      normalizedText,
      metadata: {
        bodyKind: input.bodyKind
      }
    });
    cursor = memberEnd;
  }

  return members;
}

function findMemberEnd(masked, start, closeBrace) {
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let index = start; index < closeBrace; index += 1) {
    const char = masked[index];
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      if (braceDepth > 0) {
        braceDepth -= 1;
        if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
          return includeImmediateMemberDelimiter(masked, index + 1, closeBrace);
        }
      }
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      continue;
    }
    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (char === "(") {
      parenDepth += 1;
      continue;
    }
    if (char === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if ((char === ";" || char === ",") && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      return index + 1;
    }
  }

  return closeBrace;
}

function includeImmediateMemberDelimiter(masked, end, closeBrace) {
  let cursor = end;
  while (cursor < closeBrace && isHorizontalWhitespace(masked[cursor])) {
    cursor += 1;
  }
  if (masked[cursor] === ";" || masked[cursor] === ",") {
    return cursor + 1;
  }
  return end;
}

function parseMemberKey(source, masked, start, end, bodyKind) {
  let cursor = start;
  let memberKind = "member";
  cursor = skipWhitespace(masked, cursor, end);

  while (true) {
    const token = readIdentifierToken(masked, cursor, end);
    if (!token || !MEMBER_MODIFIERS.has(token.value)) {
      break;
    }
    cursor = skipWhitespace(masked, token.end, end);
  }

  const accessor = readIdentifierToken(masked, cursor, end);
  if (accessor && MEMBER_ACCESSORS.has(accessor.value)) {
    const next = skipWhitespace(masked, accessor.end, end);
    const nextToken = readIdentifierToken(masked, next, end);
    if (nextToken || masked[next] === "[" || masked[next] === "\"" || masked[next] === "'") {
      memberKind = accessor.value === "get" ? "getter" : "setter";
      cursor = next;
    }
  }

  if (masked[cursor] === "[") {
    const closeBracket = findMatchingBracket(masked, cursor, end);
    return {
      name: source.slice(cursor, closeBracket === undefined ? end : closeBracket + 1).trim(),
      computed: true,
      memberKind,
      start: cursor,
      end: closeBracket === undefined ? undefined : closeBracket + 1
    };
  }

  if (masked[cursor] === "\"" || masked[cursor] === "'") {
    const keyEnd = scanQuotedKey(source, cursor, end);
    const raw = source.slice(cursor + 1, Math.max(cursor + 1, keyEnd - 1));
    return {
      name: raw,
      computed: false,
      memberKind,
      start: cursor,
      end: keyEnd
    };
  }

  if (masked[cursor] === "(") {
    return {
      name: undefined,
      computed: false,
      memberKind: bodyKind === "class" ? "method" : "callSignature",
      start: cursor,
      end: cursor + 1
    };
  }

  const privateName = readPrivateIdentifierToken(masked, cursor, end);
  if (privateName) {
    return {
      name: privateName.value,
      computed: false,
      memberKind,
      start: privateName.start,
      end: privateName.end
    };
  }

  const token = readIdentifierToken(masked, cursor, end) ?? readNumberToken(masked, cursor, end);
  if (!token) {
    return {
      name: undefined,
      computed: false,
      memberKind,
      start: cursor,
      end: undefined
    };
  }

  if (token.value === "constructor") {
    memberKind = "constructor";
  } else if (memberKind === "member" && nextNonWhitespaceOffset(masked, token.end, end) < end && masked[nextNonWhitespaceOffset(masked, token.end, end)] === "(") {
    memberKind = "method";
  } else if (memberKind === "member") {
    memberKind = bodyKind === "object" ? "property" : "field";
  }

  return {
    name: token.value,
    computed: false,
    memberKind,
    start: token.start,
    end: token.end
  };
}

function analyzeOneSidedMemberBodyChange(input) {
  const safeAdds = [];
  const conflicts = [];
  const baseDuplicateNames = duplicateMemberNames(input.baseBody.members);
  const changedDuplicateNames = duplicateMemberNames(input.changedBody.members);
  if (!hasStableBodySpan(input.baseBody) || !hasStableBodySpan(input.changedBody)) {
    conflicts.push(createMemberMergeClassification({
      bodyKey: input.bodyKey,
      classification: "conflict",
      side: input.side,
      changeKind: "span",
      baseBodies: [input.baseBody],
      leftBodies: [input.leftBody],
      rightBodies: [input.rightBody],
      reasons: [`Member body ${input.bodyKey} is missing numeric body spans.`]
    }));
    return { safeAdds, conflicts };
  }
  if (baseDuplicateNames.length > 0 || changedDuplicateNames.length > 0) {
    conflicts.push(createMemberMergeClassification({
      bodyKey: input.bodyKey,
      classification: "conflict",
      side: input.side,
      changeKind: "duplicate",
      baseBodies: [input.baseBody],
      leftBodies: [input.leftBody],
      rightBodies: [input.rightBody],
      reasons: [`Member body ${input.bodyKey} has duplicate member name(s): ${unique([...baseDuplicateNames, ...changedDuplicateNames]).sort(ordinalCompare).join(", ")}.`]
    }));
    return { safeAdds, conflicts };
  }

  const baseByName = groupMembersByName(input.baseBody.members);
  const changedByName = groupMembersByName(input.changedBody.members);
  const memberNames = unique([
    ...baseByName.keys(),
    ...changedByName.keys()
  ]).sort(ordinalCompare);
  const added = [];
  const edited = [];
  const deleted = [];
  const unstable = [];
  const computed = [];

  for (const memberName of memberNames) {
    const baseMember = baseByName.get(memberName)?.[0];
    const changedMember = changedByName.get(memberName)?.[0];
    if (!baseMember && changedMember) {
      added.push(changedMember);
      if (!changedMember.stableKey) unstable.push(changedMember);
      if (changedMember.computed) computed.push(changedMember);
      continue;
    }
    if (baseMember && !changedMember) {
      deleted.push(baseMember);
      if (baseMember.computed) computed.push(baseMember);
      continue;
    }
    if (baseMember && changedMember && baseMember.contentHash !== changedMember.contentHash) {
      edited.push(changedMember);
      if (!changedMember.stableKey) unstable.push(changedMember);
      if (baseMember.computed || changedMember.computed) computed.push(changedMember);
    }
  }

  if (computed.length > 0) {
    conflicts.push(createMemberMergeClassification({
      bodyKey: input.bodyKey,
      classification: "conflict",
      side: input.side,
      changeKind: "computed",
      baseBodies: [input.baseBody],
      leftBodies: [input.leftBody],
      rightBodies: [input.rightBody],
      members: computed,
      reasons: [`Member body ${input.bodyKey} changes computed member key(s).`]
    }));
  }
  if (unstable.length > 0) {
    conflicts.push(createMemberMergeClassification({
      bodyKey: input.bodyKey,
      classification: "conflict",
      side: input.side,
      changeKind: "unstable-key",
      baseBodies: [input.baseBody],
      leftBodies: [input.leftBody],
      rightBodies: [input.rightBody],
      members: unstable,
      reasons: [`Member body ${input.bodyKey} has member changes without stable names.`]
    }));
  }
  if (edited.length > 0 || deleted.length > 0) {
    conflicts.push(createMemberMergeClassification({
      bodyKey: input.bodyKey,
      classification: "conflict",
      side: input.side,
      changeKind: edited.length > 0 ? "edit" : "delete",
      baseBodies: [input.baseBody],
      leftBodies: [input.leftBody],
      rightBodies: [input.rightBody],
      members: [...edited, ...deleted],
      reasons: [`Member body ${input.bodyKey} edits or deletes existing members.`]
    }));
  }
  if (conflicts.length > 0) {
    return { safeAdds, conflicts };
  }
  if (added.length === 0) {
    conflicts.push(createMemberMergeClassification({
      bodyKey: input.bodyKey,
      classification: "conflict",
      side: input.side,
      changeKind: "order",
      baseBodies: [input.baseBody],
      leftBodies: [input.leftBody],
      rightBodies: [input.rightBody],
      reasons: [`Member body ${input.bodyKey} changed without a stable member addition.`]
    }));
    return { safeAdds, conflicts };
  }

  safeAdds.push(createMemberMergeClassification({
    bodyKey: input.bodyKey,
    classification: "safe-member-add",
    side: input.side,
    changeKind: "add",
    baseBodies: [input.baseBody],
    leftBodies: [input.leftBody],
    rightBodies: [input.rightBody],
    members: added,
    reasons: [`Member body ${input.bodyKey} adds ${added.length} stable member(s) on ${input.side} only.`]
  }));
  return { safeAdds, conflicts };
}

function detectOutsideSourceConflict(normalized, safeAdds, conflicts) {
  if (conflicts.length > 0 || safeAdds.length === 0) {
    return undefined;
  }
  const changedSides = unique(safeAdds.map((entry) => entry.side)).sort(ordinalCompare);
  if (changedSides.length !== 1) {
    return createMemberMergeClassification({
      bodyKey: "jsts-member-merge:source",
      classification: "conflict",
      side: "both",
      changeKind: "source",
      reasons: ["Safe member merge only emits source when all safe additions come from one side."]
    });
  }
  if (!hasSourceTriplet(normalized)) {
    return undefined;
  }
  const unchangedSide = changedSides[0] === "left" ? "right" : "left";
  if (sourceForSide(normalized, unchangedSide) !== normalized.baseSource) {
    return createMemberMergeClassification({
      bodyKey: "jsts-member-merge:source",
      classification: "conflict",
      side: "both",
      changeKind: "source",
      reasons: [`The ${unchangedSide} source differs from base outside the one-sided member addition path.`]
    });
  }
  return undefined;
}

function collectBodiesForSide(side, input) {
  const contract = input[`${side}Contract`];
  if (contract) {
    return collectBodiesFromContract(contract, {
      sourceText: sourceForSide(input, side),
      sourcePath: input.sourcePath,
      side
    });
  }
  return collectJsTsSafeMergeBodies(sourceForSide(input, side), input);
}

function collectBodiesFromContract(contract, options = {}) {
  const sourceText = typeof options.sourceText === "string" ? options.sourceText : undefined;
  const declarations = contract?.topLevelDeclarations ?? [];
  const members = contract?.members ?? [];
  return declarations.map((declaration) => {
    const bodyKind = declaration.declarationKind ?? "declaration";
    const identityKey = bodyIdentityKey({
      bodyKind,
      name: declaration.name ?? declaration.id,
      sourcePath: contract.sourcePath ?? options.sourcePath
    });
    const bodyMembers = members
      .filter((member) => member.ownerDeclarationId === declaration.id || member.ownerId === declaration.id || (declaration.memberIds ?? []).includes(member.id))
      .map((member) => contractMemberToSafeMember(member, {
        bodyKey: identityKey,
        sourceText,
        sourcePath: contract.sourcePath ?? options.sourcePath
      }));
    return {
      kind: "frontier.lang.jsTsSafeMergeBody",
      version: 1,
      id: `${identityKey}:${declaration.id}`,
      bodyKind,
      name: declaration.name,
      identityKey,
      conflictKeys: [identityKey],
      sourceSpan: declaration.sourceSpan,
      bodySpan: declaration.bodySpan,
      members: bodyMembers,
      contentHash: bodyContentHash(bodyMembers),
      text: sourceSlice(sourceText, declaration.sourceSpan),
      metadata: {
        contractId: contract.id,
        declarationId: declaration.id,
        missingBodySpan: !hasNumericSpan(declaration.bodySpan)
      }
    };
  });
}

function contractMemberToSafeMember(member, options) {
  const text = sourceSlice(options.sourceText, member.sourceSpan);
  const normalizedText = text === undefined ? normalizeContractMember(member) : normalizeMemberText(text);
  const name = member.name;
  const identityKey = name
    ? jsTsSafeMemberIdentityKey({ bodyKey: options.bodyKey, name, sourcePath: options.sourcePath })
    : `jsts-member:${keyPart(options.bodyKey)}:unstable:${member.id}`;
  return {
    kind: "frontier.lang.jsTsSafeMergeMember",
    version: 1,
    id: member.id ?? identityKey,
    bodyKey: options.bodyKey,
    memberKind: member.memberKind ?? "member",
    name,
    identityKey,
    conflictKeys: member.conflictKeys ?? [identityKey],
    computed: Boolean(member.computed),
    stableKey: Boolean(name && !member.computed && hasNumericSpan(member.sourceSpan)),
    sourceSpan: member.sourceSpan,
    keySpan: member.keySpan,
    contentHash: hashSemanticValue({
      memberKind: member.memberKind ?? "member",
      text: normalizedText
    }),
    text,
    normalizedText,
    metadata: {
      contractMemberId: member.id,
      missingSourceSpan: !hasNumericSpan(member.sourceSpan)
    }
  };
}

function createMemberMergeClassification(input) {
  return {
    kind: "frontier.lang.jsTsSafeMemberMergeClassification",
    version: 1,
    bodyKey: input.bodyKey,
    classification: input.classification,
    side: input.side,
    changeKind: input.changeKind,
    baseBodies: input.baseBodies ?? [],
    leftBodies: input.leftBodies ?? [],
    rightBodies: input.rightBodies ?? [],
    members: input.members ?? [],
    reasons: input.reasons ?? []
  };
}

function groupBodiesByKey(bodies) {
  const byKey = new Map();
  for (const body of bodies ?? []) {
    const key = body.identityKey;
    if (!key) {
      continue;
    }
    const entries = byKey.get(key) ?? [];
    entries.push(body);
    byKey.set(key, entries);
  }
  return byKey;
}

function groupMembersByName(members) {
  const byName = new Map();
  for (const member of members ?? []) {
    if (!member?.name) {
      continue;
    }
    const entries = byName.get(member.name) ?? [];
    entries.push(member);
    byName.set(member.name, entries);
  }
  return byName;
}

function duplicateMemberNames(members) {
  const byName = groupMembersByName(members);
  const duplicates = [];
  for (const [name, entries] of byName) {
    if (entries.length > 1) {
      duplicates.push(name);
    }
  }
  return duplicates.sort(ordinalCompare);
}

function bodyFingerprint(body) {
  if (!body || !hasStableBodySpan(body)) {
    return undefined;
  }
  return (body.members ?? [])
    .map((member) => `${member.name ?? "unstable"}:${member.computed ? "computed" : "plain"}:${member.contentHash}`)
    .join("|");
}

function bodyContentHash(members) {
  return hashSemanticValue((members ?? []).map((member) => ({
    name: member.name,
    computed: member.computed,
    contentHash: member.contentHash
  })));
}

function changedBodySide(baseEntries, leftEntries, rightEntries) {
  if (leftEntries.length !== baseEntries.length && rightEntries.length !== baseEntries.length) {
    return "both";
  }
  if (leftEntries.length !== baseEntries.length) {
    return "left";
  }
  if (rightEntries.length !== baseEntries.length) {
    return "right";
  }
  return "both";
}

function sourceForSide(input, side) {
  if (side === "base") return input.baseSource;
  if (side === "left") return input.leftSource;
  if (side === "right") return input.rightSource;
  return undefined;
}

function hasSourceTriplet(input) {
  return typeof input.baseSource === "string" &&
    typeof input.leftSource === "string" &&
    typeof input.rightSource === "string";
}

function normalizeMemberMergeInput(input, options) {
  const merged = { ...options, ...(input ?? {}) };
  return {
    ...merged,
    baseSource: merged.baseSource ?? merged.base,
    leftSource: merged.leftSource ?? merged.left,
    rightSource: merged.rightSource ?? merged.right,
    baseContract: merged.baseContract ?? merged.baseMergeContract,
    leftContract: merged.leftContract ?? merged.leftMergeContract,
    rightContract: merged.rightContract ?? merged.rightMergeContract
  };
}

function bodyIdentityKey(input) {
  const scope = input.sourcePath ? keyPart(input.sourcePath) : "module";
  return `jsts-body:${scope}:${keyPart(input.bodyKind ?? "body")}:${keyPart(input.name ?? "anonymous")}`;
}

function normalizeMemberText(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").trim();
}

function normalizeContractMember(member) {
  return JSON.stringify({
    memberKind: member.memberKind,
    name: member.name,
    optional: member.optional,
    static: member.static,
    modifiers: member.modifiers,
    semanticNodeIds: member.semanticNodeIds,
    semanticSymbolIds: member.semanticSymbolIds,
    nativeAstNodeIds: member.nativeAstNodeIds
  });
}

function sourceSlice(sourceText, span) {
  if (typeof sourceText !== "string" || !hasNumericSpan(span)) {
    return undefined;
  }
  return sourceText.slice(span.start, span.end);
}

function hasStableBodySpan(body) {
  return hasNumericSpan(body?.bodySpan) && !(body?.metadata?.missingBodySpan);
}

function hasNumericSpan(span) {
  return typeof span?.start === "number" && typeof span?.end === "number" && span.end >= span.start;
}

function maskJsTsSafeMergeSource(source) {
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

function tokenizeJsTsSafeMergeSource(masked) {
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

function nextIdentifierToken(tokens, startTokenIndex) {
  for (let index = startTokenIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "identifier") {
      return token;
    }
    if (token.value === "{" || token.value === ";" || token.value === "=") {
      return undefined;
    }
  }
  return undefined;
}

function nextTokenValue(tokens, startTokenIndex, value) {
  for (let index = startTokenIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.value === value) {
      return token;
    }
    if (token.value === ";" || token.value === "}") {
      return undefined;
    }
  }
  return undefined;
}

function findMatchingBrace(masked, openBrace) {
  return findMatchingDelimited(masked, openBrace, masked.length, "{", "}");
}

function findMatchingBracket(masked, openBracket, end) {
  return findMatchingDelimited(masked, openBracket, end, "[", "]");
}

function findMatchingDelimited(masked, openOffset, end, openChar, closeChar) {
  let depth = 0;
  for (let index = openOffset; index < end; index += 1) {
    const char = masked[index];
    if (char === openChar) {
      depth += 1;
      continue;
    }
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return undefined;
}

function findStatementEnd(masked, start) {
  for (let index = start; index < masked.length; index += 1) {
    if (masked[index] === ";") {
      return index + 1;
    }
    if (!/\s/.test(masked[index])) {
      break;
    }
  }
  return start;
}

function skipMemberPadding(masked, start, end) {
  let cursor = start;
  while (cursor < end && (/\s/.test(masked[cursor]) || masked[cursor] === ";" || masked[cursor] === ",")) {
    cursor += 1;
  }
  return cursor;
}

function skipWhitespace(masked, start, end = masked.length) {
  let cursor = start;
  while (cursor < end && /\s/.test(masked[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function nextNonWhitespaceOffset(masked, start, end = masked.length) {
  return skipWhitespace(masked, start, end);
}

function isHorizontalWhitespace(char) {
  return char === " " || char === "\t";
}

function readIdentifierToken(masked, start, end) {
  if (!isIdentifierStart(masked[start])) {
    return undefined;
  }
  let cursor = start + 1;
  while (cursor < end && isIdentifierPart(masked[cursor])) {
    cursor += 1;
  }
  return { type: "identifier", value: masked.slice(start, cursor), start, end: cursor };
}

function readPrivateIdentifierToken(masked, start, end) {
  if (masked[start] !== "#" || !isIdentifierStart(masked[start + 1])) {
    return undefined;
  }
  let cursor = start + 2;
  while (cursor < end && isIdentifierPart(masked[cursor])) {
    cursor += 1;
  }
  return { type: "identifier", value: masked.slice(start, cursor), start, end: cursor };
}

function readNumberToken(masked, start, end) {
  if (!/[0-9]/.test(masked[start])) {
    return undefined;
  }
  let cursor = start + 1;
  while (cursor < end && /[0-9_]/.test(masked[cursor])) {
    cursor += 1;
  }
  return { type: "number", value: masked.slice(start, cursor), start, end: cursor };
}

function scanQuotedKey(source, start, end) {
  const quote = source[start];
  let cursor = start + 1;
  let escaped = false;
  while (cursor < end) {
    const char = source[cursor];
    if (escaped) {
      escaped = false;
      cursor += 1;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      cursor += 1;
      continue;
    }
    if (char === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return end;
}

function firstTokenAtOrAfter(tokens, startTokenIndex, offset) {
  let index = startTokenIndex;
  while (index < tokens.length && tokens[index].start < offset) {
    index += 1;
  }
  return index;
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

function keyPart(value) {
  if (value === undefined || value === null || value === "") return "unknown";
  return String(value).trim().replace(/:/g, "%3A").replace(/\s+/g, " ");
}

function isIdentifierStart(char) {
  return /[$_A-Za-z]/.test(char);
}

function isIdentifierPart(char) {
  return /[$_0-9A-Za-z]/.test(char);
}
