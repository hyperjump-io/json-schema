import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A keyword next to `const` or `enum` that allows the `const` value or
 * every value in `enum`, like `minLength: 3` next to `enum: ["one", "two"]`,
 * so it has no effect. Only those values can be valid, and it allows all of
 * them.
 *
 * Each keyword is evaluated on the values from what it lowers to
 * (`evaluatorForLint`), including keywords that apply schemas, like `allOf`
 * and `properties`. One that annotates a value has an effect, like an
 * `allOf` with a `title`, so `format` is never reported. So does one that
 * marks a property or an item as evaluated, if `unevaluatedProperties` or
 * `unevaluatedItems` might read it. A keyword with no effect at all, like
 * `minLength: 0`, is reported too. `type` is left to
 * `type-implied-by-const-or-enum`, so that rule can be turned off on its
 * own. In a schema with both `const` and `enum`, `enum` is a keyword next
 * to `const`. A keyword that rejects a value is reported by
 * `const-or-enum-value-rejected`, and one that might isn't reported.
 *
 * It has no options.
 */
declare const keywordImpliedByConstOrEnum: Plugin<JsonSchemaDocumentNode, void>;
export default keywordImpliedByConstOrEnum;
