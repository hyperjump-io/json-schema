import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword whose value is its `default`: the value that's the same as
 * leaving it out, as its keyword definition declares (see `Keyword`). For
 * example, `additionalProperties: true`, `items: {}`, `properties: {}`,
 * `required: []`, `minLength: 0`, `minContains: 1`, or `uniqueItems: false`.
 * A keyword whose value is a schema is reported for `true` or `{}`.
 *
 * Keywords like `additionalProperties` and `items` still mark what they
 * apply to as evaluated, so removing one can change what an
 * `unevaluatedProperties` or `unevaluatedItems` next to it, or above it,
 * allows. Nobody writes one for that, so it's still reported. Turn the rule
 * off for a schema that does.
 *
 * `multipleOf: 1` isn't a default, because it only allows integers. It has
 * no options.
 */
declare const keywordWithDefaultValue: Plugin<JsonSchemaDocumentNode, void>;
export default keywordWithDefaultValue;
