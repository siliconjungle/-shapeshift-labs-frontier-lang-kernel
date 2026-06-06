import type { FrontierLangDocument } from "./document.js";
import type { FrontierUniversalAstEnvelope } from "./universal-ast.js";

export declare function stableStringify(value: unknown): string;

export declare function hashSemanticValue(value: unknown): string;

export declare function hashDocumentBase(document: FrontierLangDocument): string;

export declare function stableUniversalAstJson(envelope: FrontierUniversalAstEnvelope): string;

export declare function hashUniversalAstEnvelope(envelope: FrontierUniversalAstEnvelope): string;
