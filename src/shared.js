

export function intersection(left, right) {
  const rightSet = new Set(right);
  return unique(left.filter((item) => rightSet.has(item)));
}

export function unique(items) {
  return [...new Set(items)];
}

export function uniqueById(records) {
  const seen = new Set();
  const result = [];
  for (const record of records) {
    if (!record?.id || seen.has(record.id)) {
      continue;
    }
    seen.add(record.id);
    result.push(record);
  }
  return result;
}

export function ordinalCompare(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export function duplicateValues(values) {
  const seen = new Set();
  const duplicates = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    if (seen.has(value) && !duplicates.includes(value)) {
      duplicates.push(value);
    }
    seen.add(value);
  }
  return duplicates;
}

export function collectUniqueIds(records, label, issues) {
  const ids = new Set();
  for (const record of records) {
    if (!record?.id) {
      issues.push(`Semantic index ${label} is missing id`);
      continue;
    }
    if (ids.has(record.id)) {
      issues.push(`Semantic index has duplicate ${label} id ${record.id}`);
    }
    ids.add(record.id);
  }
  return ids;
}

export function validateSourceSpan(span, label, issues) {
  if (!span) {
    return;
  }
  if (typeof span.start === "number" && typeof span.end === "number" && span.end < span.start) {
    issues.push(`${label} ends before it starts`);
  }
  if (typeof span.startLine === "number" && typeof span.endLine === "number") {
    if (span.endLine < span.startLine) {
      issues.push(`${label} end line is before start line`);
      return;
    }
    if (
      span.endLine === span.startLine &&
      typeof span.startColumn === "number" &&
      typeof span.endColumn === "number" &&
      span.endColumn < span.startColumn
    ) {
      issues.push(`${label} end column is before start column`);
    }
  }
}
