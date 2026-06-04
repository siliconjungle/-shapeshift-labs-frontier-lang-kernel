export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };
export type SemanticId = string;
export type NodeKind = "module" | "entity" | "state" | "action" | "view" | "migration" | "effect" | "target";
export type MergePolicyKind = "conflict" | "union" | "max" | "lastWriterWins" | "byKey" | "preserveMoves" | "manual" | "custom";

export interface MergePolicy {
  readonly kind: MergePolicyKind;
  readonly law?: "semilattice" | "commutative" | "associative" | "idempotent";
  readonly condition?: string;
  readonly customName?: string;
}

export interface SemanticRegion {
  readonly id: string;
  readonly access?: "read" | "write" | "readwrite" | "effect" | "schema" | "evidence";
}

export interface BaseNode {
  readonly kind: NodeKind;
  readonly id: SemanticId;
  readonly name: string;
  readonly parentId?: SemanticId;
  readonly regions?: readonly SemanticRegion[];
  readonly metadata?: JsonObject;
}

export interface CompileTarget {
  readonly language: "typescript" | "javascript" | string;
  readonly packageName?: string;
  readonly emitPath?: string;
  readonly moduleFormat?: "esm" | "commonjs";
}

export interface ModuleNode extends BaseNode {
  readonly kind: "module";
  readonly imports?: readonly string[];
  readonly targets?: readonly CompileTarget[];
}

export interface FieldDeclaration {
  readonly id: SemanticId;
  readonly name: string;
  readonly type: string;
  readonly key?: boolean;
  readonly merge?: MergePolicy;
  readonly metadata?: JsonObject;
}

export interface EntityNode extends BaseNode {
  readonly kind: "entity";
  readonly fields: readonly FieldDeclaration[];
}

export interface StateCollection {
  readonly id: SemanticId;
  readonly name: string;
  readonly type: string;
  readonly merge?: MergePolicy;
}

export interface StateNode extends BaseNode {
  readonly kind: "state";
  readonly collections: readonly StateCollection[];
}

export interface ActionNode extends BaseNode {
  readonly kind: "action";
  readonly input?: string;
  readonly returns?: string;
  readonly reads?: readonly string[];
  readonly writes?: readonly string[];
  readonly uses?: readonly string[];
  readonly throws?: readonly string[];
  readonly body?: readonly JsonObject[];
}

export interface ViewNode extends BaseNode {
  readonly kind: "view";
  readonly reads?: readonly string[];
  readonly dispatches?: readonly string[];
}

export interface MigrationNode extends BaseNode {
  readonly kind: "migration";
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly changes: readonly JsonObject[];
  readonly invariants?: readonly string[];
}

export interface EffectNode extends BaseNode {
  readonly kind: "effect";
  readonly capability: string;
  readonly resources?: readonly string[];
}

export interface TargetNode extends BaseNode {
  readonly kind: "target";
  readonly target: CompileTarget;
}

export type SemanticNode = ModuleNode | EntityNode | StateNode | ActionNode | ViewNode | MigrationNode | EffectNode | TargetNode;

export interface FrontierLangDocument {
  readonly kind: "frontier.lang.document";
  readonly version: 1;
  readonly id: SemanticId;
  readonly name: string;
  readonly rootIds: readonly SemanticId[];
  readonly nodes: Readonly<Record<SemanticId, SemanticNode>>;
  readonly history?: readonly ReplayEvent[];
  readonly metadata?: JsonObject;
}

export type SemanticPatchOperation =
  | { readonly op: "upsertNode"; readonly node: SemanticNode; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "removeNode"; readonly id: SemanticId; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "renameNode"; readonly id: SemanticId; readonly name: string; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "moveNode"; readonly id: SemanticId; readonly parentId?: SemanticId; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "updateNode"; readonly id: SemanticId; readonly set: JsonObject; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "addEvidence"; readonly evidence: EvidenceRecord; readonly touches?: readonly SemanticRegion[] };

export interface EvidenceRecord {
  readonly id: string;
  readonly kind: "typecheck" | "test" | "replay" | "proof" | "trace" | "review" | "note";
  readonly status: "passed" | "failed" | "unknown";
  readonly path?: string;
  readonly summary?: string;
  readonly metadata?: JsonObject;
}

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


export declare function moduleNode(input: Omit<ModuleNode, "kind">): ModuleNode;
export declare function entityNode(input: Omit<EntityNode, "kind">): EntityNode;
export declare function stateNode(input: Omit<StateNode, "kind">): StateNode;
export declare function actionNode(input: Omit<ActionNode, "kind">): ActionNode;
export declare function viewNode(input: Omit<ViewNode, "kind">): ViewNode;
export declare function migrationNode(input: Omit<MigrationNode, "kind">): MigrationNode;
export declare function effectNode(input: Omit<EffectNode, "kind">): EffectNode;
export declare function targetNode(input: Omit<TargetNode, "kind">): TargetNode;
export declare function createPatch(input: Omit<SemanticPatchBundle, "kind" | "version">): SemanticPatchBundle;
export declare function createDocument(input: {
  readonly id: SemanticId;
  readonly name: string;
  readonly nodes: readonly SemanticNode[];
  readonly rootIds?: readonly SemanticId[];
  readonly history?: readonly ReplayEvent[];
  readonly metadata?: JsonObject;
}): FrontierLangDocument;
export declare function stableStringify(value: unknown): string;
export declare function hashSemanticValue(value: unknown): string;
export declare function hashDocumentBase(document: FrontierLangDocument): string;
export declare function validateDocument(document: FrontierLangDocument): readonly string[];
export declare function applySemanticPatch(document: FrontierLangDocument, patch: SemanticPatchBundle, event?: ReplayEvent): FrontierLangDocument;
export declare function replayDocument(initial: FrontierLangDocument, events: readonly ReplayEvent[]): FrontierLangDocument;
export declare function classifyMerge(base: FrontierLangDocument, left: SemanticPatchBundle, right: SemanticPatchBundle): MergeAdmission;
