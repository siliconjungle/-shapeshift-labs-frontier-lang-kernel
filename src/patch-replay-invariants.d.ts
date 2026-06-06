import type { FrontierLangDocument } from "./document.js";
import type { EvidenceRecord } from "./evidence.js";
import type { ReplayEvent } from "./patching.js";

export type PatchReplayInvariantStatus = "passed" | "failed";

export interface PatchReplayInvariantStep {
  readonly eventId: string;
  readonly patchId: string;
  readonly beforeHash: string;
  readonly afterHash?: string;
  readonly declaredBaseHash?: string;
  readonly declaredTargetHash?: string;
  readonly status: PatchReplayInvariantStatus;
  readonly issues: readonly string[];
}

export interface PatchReplayInvariantReport {
  readonly kind: "frontier.lang.patchReplayInvariantReport";
  readonly version: 1;
  readonly id: string;
  readonly status: PatchReplayInvariantStatus;
  readonly replayComplete: boolean;
  readonly initialHash: string;
  readonly finalHash: string;
  readonly eventCount: number;
  readonly issues: readonly string[];
  readonly steps: readonly PatchReplayInvariantStep[];
  readonly evidence: EvidenceRecord;
}

export declare function verifyPatchReplayInvariants(
  initial: FrontierLangDocument,
  events: readonly ReplayEvent[],
  options?: {
    readonly id?: string;
    readonly evidenceId?: string;
  }
): PatchReplayInvariantReport;
