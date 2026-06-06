import type {
  BaseNode,
  CompileTarget,
  FrontierSourceLanguage,
  JsonObject,
  JsonValue,
  MergeLaw,
  MergePolicy,
  SemanticId,
  SemanticValueSemantics,
  TypeExpression,
  TypeFieldDeclaration,
  TypeVariantDeclaration
} from "./base.js";
import type { NativeAstLossRecord, NativeAstRecord } from "./source-records.js";
import type { ReplayEvent } from "./patching.js";

export interface ModuleNode extends BaseNode {
  readonly kind: "module";
  readonly imports?: readonly string[];
  readonly targets?: readonly CompileTarget[];
}

export interface FieldDeclaration {
  readonly id: SemanticId;
  readonly name: string;
  readonly type: TypeExpression;
  readonly key?: boolean;
  readonly merge?: MergePolicy;
  readonly semantic?: SemanticValueSemantics;
  readonly metadata?: JsonObject;
}

export interface EntityNode extends BaseNode {
  readonly kind: "entity";
  readonly fields: readonly FieldDeclaration[];
}

export interface StateCollection {
  readonly id: SemanticId;
  readonly name: string;
  readonly type: TypeExpression;
  readonly merge?: MergePolicy;
  readonly semantic?: SemanticValueSemantics;
  readonly metadata?: JsonObject;
}

export interface StateNode extends BaseNode {
  readonly kind: "state";
  readonly collections: readonly StateCollection[];
}

export interface ActionNode extends BaseNode {
  readonly kind: "action";
  readonly input?: TypeExpression;
  readonly returns?: TypeExpression;
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
  readonly input?: TypeExpression;
  readonly returns?: TypeExpression;
  readonly resources?: readonly string[];
  readonly semantics?: JsonObject;
}

export interface CapabilityAdapterBinding {
  readonly target: CompileTarget;
  readonly symbol: string;
  readonly packageName?: string;
  readonly importPath?: string;
  readonly kind?: "host" | "library" | "native" | "generated" | "extern" | string;
  readonly requires?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface CapabilityUnsupportedTarget {
  readonly target: CompileTarget;
  readonly reason: string;
  readonly fallbackCapability?: string;
  readonly metadata?: JsonObject;
}

export interface CapabilityNode extends BaseNode {
  readonly kind: "capability";
  readonly capability: string;
  readonly category?: "network" | "storage" | "render" | "time" | "process" | "crypto" | "filesystem" | "custom" | string;
  readonly input?: TypeExpression;
  readonly returns?: TypeExpression;
  readonly effects?: readonly string[];
  readonly resources?: readonly string[];
  readonly semantics?: JsonObject;
  readonly adapters?: readonly CapabilityAdapterBinding[];
  readonly unsupportedTargets?: readonly CapabilityUnsupportedTarget[];
}

export interface TargetNode extends BaseNode {
  readonly kind: "target";
  readonly target: CompileTarget;
}

export interface TypeNode extends BaseNode {
  readonly kind: "type";
  readonly parameters?: readonly string[];
  readonly type?: TypeExpression;
  readonly fields?: readonly TypeFieldDeclaration[];
  readonly variants?: readonly TypeVariantDeclaration[];
  readonly invariants?: readonly string[];
}

export interface ExternNode extends BaseNode {
  readonly kind: "extern";
  readonly language: string;
  readonly symbol: string;
  readonly capability?: string;
  readonly signature?: {
    readonly input?: TypeExpression;
    readonly returns?: TypeExpression;
  };
  readonly effects?: readonly string[];
  readonly resources?: readonly string[];
  readonly target?: CompileTarget;
}

export interface LatticeNode extends BaseNode {
  readonly kind: "lattice";
  readonly carrier: TypeExpression;
  readonly laws: readonly MergeLaw[];
  readonly identity?: JsonValue;
  readonly frontierCrdt?: {
    readonly packageName?: "@shapeshift-labs/frontier-crdt" | string;
    readonly exportName: string;
    readonly lawChecker?: string;
  };
}

export interface NativeSourceNode extends BaseNode {
  readonly kind: "nativeSource";
  readonly language: FrontierSourceLanguage;
  readonly parser?: string;
  readonly parserVersion?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly symbol?: string;
  readonly ast?: NativeAstRecord;
  readonly frontierNodeIds?: readonly SemanticId[];
  readonly losses?: readonly NativeAstLossRecord[];
  readonly target?: CompileTarget;
}

export type SemanticNode =
  | ModuleNode
  | EntityNode
  | StateNode
  | ActionNode
  | ViewNode
  | MigrationNode
  | EffectNode
  | CapabilityNode
  | TargetNode
  | TypeNode
  | ExternNode
  | LatticeNode
  | NativeSourceNode;

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

export declare function moduleNode(input: Omit<ModuleNode, "kind">): ModuleNode;

export declare function entityNode(input: Omit<EntityNode, "kind">): EntityNode;

export declare function stateNode(input: Omit<StateNode, "kind">): StateNode;

export declare function actionNode(input: Omit<ActionNode, "kind">): ActionNode;

export declare function viewNode(input: Omit<ViewNode, "kind">): ViewNode;

export declare function migrationNode(input: Omit<MigrationNode, "kind">): MigrationNode;

export declare function effectNode(input: Omit<EffectNode, "kind">): EffectNode;

export declare function capabilityNode(input: Omit<CapabilityNode, "kind">): CapabilityNode;

export declare function targetNode(input: Omit<TargetNode, "kind">): TargetNode;

export declare function typeNode(input: Omit<TypeNode, "kind">): TypeNode;

export declare function externNode(input: Omit<ExternNode, "kind">): ExternNode;

export declare function latticeNode(input: Omit<LatticeNode, "kind">): LatticeNode;

export declare function nativeSourceNode(input: Omit<NativeSourceNode, "kind">): NativeSourceNode;

export declare function createDocument(input: {
  readonly id: SemanticId;
  readonly name: string;
  readonly nodes: readonly SemanticNode[];
  readonly rootIds?: readonly SemanticId[];
  readonly history?: readonly ReplayEvent[];
  readonly metadata?: JsonObject;
}): FrontierLangDocument;
