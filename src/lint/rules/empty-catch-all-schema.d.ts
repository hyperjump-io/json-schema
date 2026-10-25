import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword that applies a schema with no effect to every property or item
 * that others don't, like `additionalProperties: true`, `items: {}`, or
 * `unevaluatedProperties: true`. From what it lowers to, that's
 * `eachProperty` with an `except` or `unevaluated` selector, or `eachItem`,
 * applying a schema that counts as `true` (see `keyword-without-effect`).
 *
 * It still marks what it applies to as evaluated, so removing it can change
 * what an `unevaluated*` allows. Writing it for that is a mistake, so it's
 * reported anyway. Turn the rule off for a schema that does.
 */
declare const emptyCatchAllSchema: Plugin<JsonSchemaDocumentNode, void>;
export default emptyCatchAllSchema;
