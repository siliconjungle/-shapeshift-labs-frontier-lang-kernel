import { ParadigmSemanticsRecordGroups } from "./constants.js";

export function collectParadigmRecordEntries(paradigmSemantics) {
  if (!paradigmSemantics || typeof paradigmSemantics !== "object") {
    return [];
  }
  return ParadigmSemanticsRecordGroups.flatMap((group) =>
    (paradigmSemantics[group] ?? []).map((record) => ({ group, record }))
  );
}

export function collectParadigmRecords(paradigmSemantics) {
  return collectParadigmRecordEntries(paradigmSemantics).map((entry) => entry.record);
}
