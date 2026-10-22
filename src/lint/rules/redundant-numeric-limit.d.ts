import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `maximum` and `exclusiveMaximum`, or `minimum` and `exclusiveMinimum`, in
 * the same schema, where one of them never fails on its own because the
 * other is tighter. The looser one is reported. If they're equal, the
 * exclusive one is tighter.
 *
 * Draft-04's `exclusiveMaximum` and `exclusiveMinimum` are booleans that
 * change `maximum` and `minimum`, so they're never redundant. A lower limit
 * above an upper one is reported by `contradictory-limits`. It only looks
 * at one schema at a time. It has no options.
 */
declare const redundantNumericLimit: Plugin<JsonSchemaDocumentNode, void>;
export default redundantNumericLimit;
