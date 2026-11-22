import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An empty array where the specs say it can't be empty: `allOf`, `anyOf`,
 * `oneOf`, `prefixItems`, v1's `type` and `conditional`, and draft-04's
 * `required`, `enum`, and the arrays in `dependencies`. Each has an obvious
 * meaning, so this implementation accepts it: an empty `allOf`,
 * `prefixItems`, `required`, or dependency has no effect, and an empty
 * `anyOf`, `oneOf`, `type`, or `enum` allows nothing. Other
 * implementations might not accept it, so it's an error in the recommended
 * preset. Where an empty array is allowed, like `enum` after draft-04,
 * `keyword-allows-nothing` and `keyword-without-effect` report what it does
 * instead.
 * It has no options.
 */
declare const emptyArray: Plugin<JsonSchemaDocumentNode, void>;
export default emptyArray;
