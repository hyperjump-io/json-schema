import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `if` without a sibling `then` or `else`. Whether it passes or fails, the
 * schema's result is the same, so the schema doesn't do what it seems to.
 * Its annotations are still collected when it passes, so in 2019-09 and
 * later it can make properties or items evaluated for
 * `unevaluatedProperties` and `unevaluatedItems`, but that's rarely meant.
 *
 * It finds the keywords by URI, so it works in every dialect with `if`,
 * whatever they're named. It has no options.
 */
declare const ifWithoutThenElse: Plugin<JsonSchemaDocumentNode, void>;
export default ifWithoutThenElse;
