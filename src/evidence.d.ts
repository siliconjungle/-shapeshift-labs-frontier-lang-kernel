import type { JsonObject } from "./base.js";

export interface EvidenceRecord {
  readonly id: string;
  readonly kind: "typecheck" | "test" | "replay" | "proof" | "trace" | "review" | "note" | "import";
  readonly status: "passed" | "failed" | "unknown";
  readonly path?: string;
  readonly summary?: string;
  readonly metadata?: JsonObject;
}
