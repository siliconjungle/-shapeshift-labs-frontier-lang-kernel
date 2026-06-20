import type { EvidenceRecord } from "./evidence.js";
import type { FrontierSourceLanguage, JsonObject, JsonValue } from "./base.js";

export type DecisionGraphRecordKind =
  | "frontier.lang.decisionGraph.gate"
  | "frontier.lang.decisionGraph.evidence"
  | "frontier.lang.decisionGraph.semanticChange"
  | "frontier.lang.decisionGraph.candidateDecision"
  | "frontier.lang.decisionGraph.mergeDecision"
  | "frontier.lang.decisionGraph.replay"
  | "frontier.lang.decisionGraph.tournamentCandidate"
  | "frontier.lang.decisionGraph.panelProjection"
  | "frontier.lang.decisionGraph.improvementFeedback";

export type DecisionGraphRecordStatus =
  | EvidenceRecord["status"]
  | "blocked"
  | "skipped"
  | "running"
  | "open"
  | "closed"
  | string;

export type DecisionGraphDecision =
  | "accepted"
  | "rejected"
  | "needs-review"
  | "blocked"
  | "merge"
  | "do-not-merge"
  | string;

export type DecisionGraphSeverity = "info" | "warning" | "error" | "blocking" | string;

export interface DecisionGraphRecordBase<K extends DecisionGraphRecordKind> {
  readonly recordKind: K;
  readonly version: 1;
  readonly id: string;
  readonly summary?: string;
  readonly metadata?: JsonObject;
}

export interface DecisionGraphTaggedRecordBase<K extends DecisionGraphRecordKind> extends DecisionGraphRecordBase<K> {
  readonly kind: K;
}

export interface DecisionGraphGateRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.gate"> {
  readonly gateKind: string;
  readonly name?: string;
  readonly status: DecisionGraphRecordStatus;
  readonly required: boolean;
  readonly command?: string;
  readonly subjectIds: readonly string[];
  readonly candidateIds: readonly string[];
  readonly semanticChangeIds: readonly string[];
  readonly decisionIds: readonly string[];
  readonly replayRecordIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface DecisionGraphEvidenceRecord extends DecisionGraphRecordBase<"frontier.lang.decisionGraph.evidence">, EvidenceRecord {
  readonly subjectIds: readonly string[];
  readonly gateIds: readonly string[];
  readonly semanticChangeIds: readonly string[];
  readonly candidateIds: readonly string[];
  readonly decisionIds: readonly string[];
  readonly replayRecordIds: readonly string[];
}

export interface DecisionGraphSemanticChangeRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.semanticChange"> {
  readonly changeKind: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly baseHash?: string;
  readonly targetHash?: string;
  readonly patchIds: readonly string[];
  readonly operationIds: readonly string[];
  readonly semanticNodeIds: readonly string[];
  readonly semanticSymbolIds: readonly string[];
  readonly effectIds: readonly string[];
  readonly regions: readonly string[];
  readonly risk?: "low" | "medium" | "high" | "unknown" | string;
  readonly evidenceIds: readonly string[];
}

export interface DecisionGraphCandidateDecisionRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.candidateDecision"> {
  readonly candidateId?: string;
  readonly candidateIds: readonly string[];
  readonly semanticChangeIds: readonly string[];
  readonly decision: DecisionGraphDecision;
  readonly status: DecisionGraphRecordStatus;
  readonly score?: number;
  readonly rank?: number;
  readonly gateIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly reviewerIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface DecisionGraphMergeDecisionRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.mergeDecision"> {
  readonly decision: DecisionGraphDecision;
  readonly status: DecisionGraphRecordStatus;
  readonly autoMergeable: boolean;
  readonly candidateIds: readonly string[];
  readonly candidateDecisionIds: readonly string[];
  readonly semanticChangeIds: readonly string[];
  readonly baseHash?: string;
  readonly targetHash?: string;
  readonly conflictKeys: readonly string[];
  readonly gateIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly replayRecordIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface DecisionGraphReplayRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.replay"> {
  readonly status: DecisionGraphRecordStatus;
  readonly replayComplete: boolean;
  readonly deterministic: boolean;
  readonly baseHash?: string;
  readonly finalHash?: string;
  readonly eventIds: readonly string[];
  readonly patchIds: readonly string[];
  readonly gateIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly decisionIds: readonly string[];
  readonly issues: readonly string[];
  readonly steps: readonly JsonObject[];
}

export interface DecisionGraphTournamentCandidateRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.tournamentCandidate"> {
  readonly tournamentId?: string;
  readonly candidateId?: string;
  readonly lane?: string;
  readonly taskId?: string;
  readonly agentId?: string;
  readonly rank?: number;
  readonly score?: number;
  readonly metrics?: JsonObject;
  readonly semanticChangeIds: readonly string[];
  readonly gateIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly decisionIds: readonly string[];
}

export interface DecisionGraphPanelProjectionRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.panelProjection"> {
  readonly panelId?: string;
  readonly projectionKind: string;
  readonly status: DecisionGraphRecordStatus;
  readonly subjectIds: readonly string[];
  readonly candidateIds: readonly string[];
  readonly mergeDecisionIds: readonly string[];
  readonly gateIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly fields: readonly string[];
  readonly projection?: JsonObject;
}

export interface DecisionGraphImprovementFeedbackRecord extends DecisionGraphTaggedRecordBase<"frontier.lang.decisionGraph.improvementFeedback"> {
  readonly loopId?: string;
  readonly loopKind: "improvement" | "rsi" | string;
  readonly feedbackKind: string;
  readonly subjectId?: string;
  readonly severity: DecisionGraphSeverity;
  readonly status: DecisionGraphRecordStatus;
  readonly action?: string;
  readonly semanticChangeIds: readonly string[];
  readonly decisionIds: readonly string[];
  readonly gateIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly feedback?: JsonObject;
}

export type DecisionGraphRecord =
  | DecisionGraphGateRecord
  | DecisionGraphEvidenceRecord
  | DecisionGraphSemanticChangeRecord
  | DecisionGraphCandidateDecisionRecord
  | DecisionGraphMergeDecisionRecord
  | DecisionGraphReplayRecord
  | DecisionGraphTournamentCandidateRecord
  | DecisionGraphPanelProjectionRecord
  | DecisionGraphImprovementFeedbackRecord;

export interface DecisionGraphReferenceInput {
  readonly subjectId?: string;
  readonly subjectIds?: readonly string[];
  readonly candidateId?: string;
  readonly candidateIds?: readonly string[];
  readonly semanticChangeId?: string;
  readonly semanticChangeIds?: readonly string[];
  readonly decisionId?: string;
  readonly decisionIds?: readonly string[];
  readonly gateId?: string;
  readonly gateIds?: readonly string[];
  readonly evidenceId?: string;
  readonly evidenceIds?: readonly string[];
  readonly replayRecordId?: string;
  readonly replayRecordIds?: readonly string[];
}

export interface DecisionGraphRecordInputBase extends DecisionGraphReferenceInput {
  readonly id?: string;
  readonly summary?: string;
  readonly metadata?: JsonObject;
}

export interface DecisionGraphGateRecordInput extends DecisionGraphRecordInputBase {
  readonly gateKind?: string;
  readonly gate?: string;
  readonly name?: string;
  readonly status?: DecisionGraphRecordStatus;
  readonly required?: boolean;
  readonly command?: string;
}

export interface DecisionGraphEvidenceRecordInput extends DecisionGraphRecordInputBase {
  readonly kind?: EvidenceRecord["kind"];
  readonly evidenceKind?: EvidenceRecord["kind"];
  readonly status?: EvidenceRecord["status"];
  readonly path?: string;
}

export interface DecisionGraphSemanticChangeRecordInput extends DecisionGraphRecordInputBase {
  readonly changeKind?: string;
  readonly language?: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly baseHash?: string;
  readonly targetHash?: string;
  readonly patchId?: string;
  readonly patchIds?: readonly string[];
  readonly operationId?: string;
  readonly operationIds?: readonly string[];
  readonly semanticNodeId?: string;
  readonly semanticNodeIds?: readonly string[];
  readonly nodeId?: string;
  readonly nodeIds?: readonly string[];
  readonly semanticSymbolId?: string;
  readonly semanticSymbolIds?: readonly string[];
  readonly effectId?: string;
  readonly effectIds?: readonly string[];
  readonly region?: string;
  readonly regions?: readonly string[];
  readonly risk?: "low" | "medium" | "high" | "unknown" | string;
}

export interface DecisionGraphCandidateDecisionRecordInput extends DecisionGraphRecordInputBase {
  readonly decision?: DecisionGraphDecision;
  readonly status?: DecisionGraphRecordStatus;
  readonly score?: number;
  readonly rank?: number;
  readonly reviewerId?: string;
  readonly reviewerIds?: readonly string[];
  readonly reason?: string;
  readonly reasons?: readonly string[];
}

export interface DecisionGraphMergeDecisionRecordInput extends DecisionGraphRecordInputBase {
  readonly decision?: DecisionGraphDecision;
  readonly status?: DecisionGraphRecordStatus;
  readonly autoMergeable?: boolean;
  readonly candidateDecisionId?: string;
  readonly candidateDecisionIds?: readonly string[];
  readonly baseHash?: string;
  readonly targetHash?: string;
  readonly conflictKey?: string;
  readonly conflictKeys?: readonly string[];
  readonly reason?: string;
  readonly reasons?: readonly string[];
}

export interface DecisionGraphReplayRecordInput extends DecisionGraphRecordInputBase {
  readonly status?: DecisionGraphRecordStatus;
  readonly replayComplete?: boolean;
  readonly deterministic?: boolean;
  readonly baseHash?: string;
  readonly finalHash?: string;
  readonly eventId?: string;
  readonly eventIds?: readonly string[];
  readonly patchId?: string;
  readonly patchIds?: readonly string[];
  readonly issue?: string;
  readonly issues?: readonly string[];
  readonly steps?: readonly JsonObject[];
}

export interface DecisionGraphTournamentCandidateRecordInput extends DecisionGraphRecordInputBase {
  readonly tournamentId?: string;
  readonly candidateId?: string;
  readonly lane?: string;
  readonly taskId?: string;
  readonly agentId?: string;
  readonly rank?: number;
  readonly score?: number;
  readonly metrics?: JsonObject;
}

export interface DecisionGraphPanelProjectionRecordInput extends DecisionGraphRecordInputBase {
  readonly panelId?: string;
  readonly projectionKind?: string;
  readonly status?: DecisionGraphRecordStatus;
  readonly mergeDecisionId?: string;
  readonly mergeDecisionIds?: readonly string[];
  readonly field?: string;
  readonly fields?: readonly string[];
  readonly projection?: JsonObject;
}

export interface DecisionGraphImprovementFeedbackRecordInput extends DecisionGraphRecordInputBase {
  readonly loopId?: string;
  readonly loopKind?: "improvement" | "rsi" | string;
  readonly feedbackKind?: string;
  readonly subjectId?: string;
  readonly severity?: DecisionGraphSeverity;
  readonly status?: DecisionGraphRecordStatus;
  readonly action?: string;
  readonly feedback?: JsonObject;
}

export declare const DECISION_GRAPH_RECORD_KINDS: readonly DecisionGraphRecordKind[];
export declare function stableDecisionGraphRecordId(prefix: string, identity?: JsonValue): string;
export declare function createDecisionGraphGateRecord(input?: DecisionGraphGateRecordInput): DecisionGraphGateRecord;
export declare function createDecisionGraphEvidenceRecord(input?: DecisionGraphEvidenceRecordInput): DecisionGraphEvidenceRecord;
export declare function createDecisionGraphSemanticChangeRecord(input?: DecisionGraphSemanticChangeRecordInput): DecisionGraphSemanticChangeRecord;
export declare function createDecisionGraphCandidateDecisionRecord(input?: DecisionGraphCandidateDecisionRecordInput): DecisionGraphCandidateDecisionRecord;
export declare function createDecisionGraphMergeDecisionRecord(input?: DecisionGraphMergeDecisionRecordInput): DecisionGraphMergeDecisionRecord;
export declare function createDecisionGraphReplayRecord(input?: DecisionGraphReplayRecordInput): DecisionGraphReplayRecord;
export declare function createDecisionGraphTournamentCandidateRecord(input?: DecisionGraphTournamentCandidateRecordInput): DecisionGraphTournamentCandidateRecord;
export declare function createDecisionGraphPanelProjectionRecord(input?: DecisionGraphPanelProjectionRecordInput): DecisionGraphPanelProjectionRecord;
export declare function createDecisionGraphImprovementFeedbackRecord(input?: DecisionGraphImprovementFeedbackRecordInput): DecisionGraphImprovementFeedbackRecord;
