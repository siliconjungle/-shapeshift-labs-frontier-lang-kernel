import type { JsonObject, SemanticId, SemanticRegion } from "./base.js";
import type { EvidenceRecord } from "./evidence.js";
import type { FrontierLangDocument, SemanticNode } from "./document.js";

export type SemanticPatchOperation =
  | { readonly op: "upsertNode"; readonly node: SemanticNode; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "removeNode"; readonly id: SemanticId; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "renameNode"; readonly id: SemanticId; readonly name: string; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "moveNode"; readonly id: SemanticId; readonly parentId?: SemanticId; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "updateNode"; readonly id: SemanticId; readonly set: JsonObject; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "addEvidence"; readonly evidence: EvidenceRecord; readonly touches?: readonly SemanticRegion[] };

export interface SemanticPatchBundle {
  readonly kind: "frontier.lang.patch";
  readonly version: 1;
  readonly id: string;
  readonly baseHash?: string;
  readonly targetHash?: string;
  readonly author?: string;
  readonly risk?: "low" | "medium" | "high" | "unknown";
  readonly operations: readonly SemanticPatchOperation[];
  readonly evidence?: readonly EvidenceRecord[];
  readonly metadata?: JsonObject;
}

export interface ReplayEvent {
  readonly id: string;
  readonly at?: string;
  readonly actor?: string;
  readonly patch: SemanticPatchBundle;
}

export type MergeStatus =
  | "safe-by-disjoint-region"
  | "safe-by-same-change"
  | "safe-by-merge-law"
  | "conflict-by-overlap"
  | "conflict-by-effect-overlap"
  | "unknown-by-dynamic-effect"
  | "unknown-needs-review";

export interface MergeAdmission {
  readonly status: MergeStatus;
  readonly autoMergeable: boolean;
  readonly reasons: readonly string[];
  readonly overlappingNodeIds: readonly SemanticId[];
  readonly overlappingRegions: readonly string[];
  readonly overlappingEffects: readonly string[];
  readonly evidence: readonly EvidenceRecord[];
}

export declare function createPatch(input: Omit<SemanticPatchBundle, "kind" | "version">): SemanticPatchBundle;

export declare function applySemanticPatch(document: FrontierLangDocument, patch: SemanticPatchBundle, event?: ReplayEvent): FrontierLangDocument;

export declare function replayDocument(initial: FrontierLangDocument, events: readonly ReplayEvent[]): FrontierLangDocument;

export declare function classifyMerge(base: FrontierLangDocument, left: SemanticPatchBundle, right: SemanticPatchBundle): MergeAdmission;
