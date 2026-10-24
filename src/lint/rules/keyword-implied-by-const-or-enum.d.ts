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
 * `unevaluatedItems` might read it. `type` is reported by
 * `type-implied-by-const-or-enum`, and a keyword with its default value by
 * `keyword-with-default-value`. A keyword that rejects a value is reported
 * by `const-or-enum-value-rejected`, and one that might isn't reported.
 *
 * It has no options.
 */
declare const keywordImpliedByConstOrEnum: Plugin<JsonSchemaDocumentNode, void>;
export default keywordImpliedByConstOrEnum;
