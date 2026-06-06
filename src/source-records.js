import { collectUniqueIds } from "./shared.js";

export function createNativeAstRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.nativeAst",
    version: 1
  };
}

export function createSemanticIndexRecord(input) {
  return {
    ...input,
    kind: "frontier.lang.semanticIndex",
    version: 1,
    documents: input.documents ?? [],
    symbols: input.symbols ?? [],
    occurrences: input.occurrences ?? [],
    relations: input.relations ?? [],
    facts: input.facts ?? []
  };
}

export function validateSemanticIndexRecord(index) {
  const issues = [];
  if (index.kind !== "frontier.lang.semanticIndex") {
    issues.push(`Semantic index ${index.id ?? "(unknown)"} has invalid kind`);
  }
  if (index.version !== 1) {
    issues.push(`Semantic index ${index.id ?? "(unknown)"} has unsupported version ${index.version}`);
  }

  const documentIds = collectUniqueIds(index.documents ?? [], "document", issues);
  const symbolIds = collectUniqueIds(index.symbols ?? [], "symbol", issues);
  const occurrenceIds = collectUniqueIds(index.occurrences ?? [], "occurrence", issues);
  collectUniqueIds(index.relations ?? [], "relation", issues);
  collectUniqueIds(index.facts ?? [], "fact", issues);

  for (const document of index.documents ?? []) {
    if (!document.path) issues.push(`Semantic index document ${document.id} is missing path`);
    if (!document.language) issues.push(`Semantic index document ${document.id} is missing language`);
  }

  for (const symbol of index.symbols ?? []) {
    if (!symbol.name) issues.push(`Semantic index symbol ${symbol.id} is missing name`);
    if (!symbol.kind) issues.push(`Semantic index symbol ${symbol.id} is missing kind`);
  }

  for (const occurrence of index.occurrences ?? []) {
    if (!documentIds.has(occurrence.documentId)) {
      issues.push(`Semantic index occurrence ${occurrence.id} references missing document ${occurrence.documentId}`);
    }
    if (!symbolIds.has(occurrence.symbolId)) {
      issues.push(`Semantic index occurrence ${occurrence.id} references missing symbol ${occurrence.symbolId}`);
    }
    if (!occurrence.role) issues.push(`Semantic index occurrence ${occurrence.id} is missing role`);
  }

  const graphIds = new Set([
    ...documentIds,
    ...symbolIds,
    ...occurrenceIds,
    ...(index.facts ?? []).map((fact) => fact.id)
  ]);

  for (const relation of index.relations ?? []) {
    if (!graphIds.has(relation.sourceId)) {
      issues.push(`Semantic index relation ${relation.id} references missing source ${relation.sourceId}`);
    }
    if (!graphIds.has(relation.targetId)) {
      issues.push(`Semantic index relation ${relation.id} references missing target ${relation.targetId}`);
    }
    if (!relation.predicate) issues.push(`Semantic index relation ${relation.id} is missing predicate`);
  }

  for (const fact of index.facts ?? []) {
    if (!fact.predicate) issues.push(`Semantic index fact ${fact.id} is missing predicate`);
    if (!graphIds.has(fact.subjectId)) {
      issues.push(`Semantic index fact ${fact.id} references missing subject ${fact.subjectId}`);
    }
    if (fact.objectId && !graphIds.has(fact.objectId)) {
      issues.push(`Semantic index fact ${fact.id} references missing object ${fact.objectId}`);
    }
  }

  return issues;
}
