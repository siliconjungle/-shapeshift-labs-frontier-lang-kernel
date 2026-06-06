

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
  | "php"
  | "ruby"
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
