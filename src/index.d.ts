export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };
export type JsonObject = { readonly [key: string]: JsonValue };
export type SemanticId = string;
export type NodeKind =
  | "module"
  | "entity"
  | "state"
  | "action"
  | "view"
  | "migration"
  | "effect"
  | "capability"
  | "target"
  | "type"
  | "extern"
  | "lattice"
  | "nativeSource";
export type MergePolicyKind = "conflict" | "union" | "max" | "lastWriterWins" | "byKey" | "preserveMoves" | "manual" | "custom";
export type MergeLaw = "semilattice" | "commutative" | "associative" | "idempotent";

export interface MergePolicy {
  readonly kind: MergePolicyKind;
  readonly law?: MergeLaw;
  readonly laws?: readonly MergeLaw[];
  readonly latticeId?: SemanticId | string;
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

export type FrontierSourceLanguage =
  | "typescript"
  | "javascript"
  | "rust"
  | "python"
  | "c"
  | "cpp"
  | "go"
  | "java"
  | "kotlin"
  | "csharp"
  | "swift"
  | "wasm"
  | string;

export interface SourceSpan {
  readonly sourceId?: string;
  readonly path?: string;
  readonly start?: number;
  readonly end?: number;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface NativeAstNode {
  readonly id: string;
  readonly kind: string;
  readonly languageKind?: string;
  readonly span?: SourceSpan;
  readonly value?: JsonValue;
  readonly fields?: Readonly<Record<string, JsonValue | readonly string[] | string | null>>;
  readonly children?: readonly string[];
  readonly metadata?: JsonObject;
}

export interface NativeAstLossRecord {
  readonly id: string;
  readonly severity: "info" | "warning" | "error";
  readonly kind:
    | "unsupportedSyntax"
    | "unsupportedSemantic"
    | "opaqueNative"
    | "missingTypeInfo"
    | "macroExpansion"
    | "preprocessor"
    | "dynamicRuntime"
    | "unresolvedSymbol"
    | "nonRoundTrippable"
    | string;
  readonly message: string;
  readonly span?: SourceSpan;
  readonly nodeId?: string;
  readonly metadata?: JsonObject;
}

export interface NativeAstRecord {
  readonly kind: "frontier.lang.nativeAst";
  readonly version: 1;
  readonly id: string;
  readonly language: FrontierSourceLanguage;
  readonly parser?: string;
  readonly parserVersion?: string;
  readonly sourcePath?: string;
  readonly sourceHash?: string;
  readonly rootId: string;
  readonly nodes: Readonly<Record<string, NativeAstNode>>;
  readonly losses?: readonly NativeAstLossRecord[];
  readonly metadata?: JsonObject;
}

export interface CompileTarget {
  readonly language: "typescript" | "javascript" | string;
  readonly platform?: "node" | "browser" | "server" | "native" | "wasm" | "embedded" | string;
  readonly framework?: string;
  readonly packageName?: string;
  readonly adapterPackage?: string;
  readonly emitPath?: string;
  readonly moduleFormat?: "esm" | "commonjs";
  readonly features?: readonly string[];
}

export type TypeExpression =
  | string
  | { readonly kind: "ref"; readonly name: string; readonly args?: readonly TypeExpression[] }
  | { readonly kind: "list"; readonly item: TypeExpression }
  | { readonly kind: "set"; readonly item: TypeExpression }
  | { readonly kind: "map"; readonly key: TypeExpression; readonly value: TypeExpression }
  | { readonly kind: "record"; readonly fields: readonly TypeFieldDeclaration[] }
  | { readonly kind: "union"; readonly variants: readonly TypeVariantDeclaration[] };

export interface TypeFieldDeclaration {
  readonly id: SemanticId;
  readonly name: string;
  readonly type: TypeExpression;
  readonly optional?: boolean;
  readonly metadata?: JsonObject;
}

export interface TypeVariantDeclaration {
  readonly id?: SemanticId;
  readonly name: string;
  readonly fields?: readonly TypeFieldDeclaration[];
  readonly metadata?: JsonObject;
}

export interface SemanticValueSemantics {
  readonly kind: "plain" | "lattice" | "crdt";
  readonly latticeId?: SemanticId | string;
  readonly crdt?: {
    readonly packageName?: string;
    readonly exportName?: string;
    readonly type?: "g-counter" | "pn-counter" | "or-set" | "mv-register" | "or-map" | string;
  };
  readonly metadata?: JsonObject;
}

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

export type SemanticPatchOperation =
  | { readonly op: "upsertNode"; readonly node: SemanticNode; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "removeNode"; readonly id: SemanticId; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "renameNode"; readonly id: SemanticId; readonly name: string; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "moveNode"; readonly id: SemanticId; readonly parentId?: SemanticId; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "updateNode"; readonly id: SemanticId; readonly set: JsonObject; readonly touches?: readonly SemanticRegion[] }
  | { readonly op: "addEvidence"; readonly evidence: EvidenceRecord; readonly touches?: readonly SemanticRegion[] };

export interface EvidenceRecord {
  readonly id: string;
  readonly kind: "typecheck" | "test" | "replay" | "proof" | "trace" | "review" | "note" | "import";
  readonly status: "passed" | "failed" | "unknown";
  readonly path?: string;
  readonly summary?: string;
  readonly metadata?: JsonObject;
}

export interface LanguageImportResult {
  readonly kind: "frontier.lang.importResult";
  readonly version: 1;
  readonly id: string;
  readonly language: FrontierSourceLanguage;
  readonly sourcePath?: string;
  readonly document: FrontierLangDocument;
  readonly patch?: SemanticPatchBundle;
  readonly nativeAst?: NativeAstRecord;
  readonly losses: readonly NativeAstLossRecord[];
  readonly evidence: readonly EvidenceRecord[];
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
export declare function capabilityNode(input: Omit<CapabilityNode, "kind">): CapabilityNode;
export declare function targetNode(input: Omit<TargetNode, "kind">): TargetNode;
export declare function typeNode(input: Omit<TypeNode, "kind">): TypeNode;
export declare function externNode(input: Omit<ExternNode, "kind">): ExternNode;
export declare function latticeNode(input: Omit<LatticeNode, "kind">): LatticeNode;
export declare function nativeSourceNode(input: Omit<NativeSourceNode, "kind">): NativeSourceNode;
export declare function createNativeAstRecord(input: Omit<NativeAstRecord, "kind" | "version">): NativeAstRecord;
export declare function createImportResult(input: Omit<LanguageImportResult, "kind" | "version">): LanguageImportResult;
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
