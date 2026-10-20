import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `minContains` or `maxContains` without a sibling `contains`. They count the
 * items that pass `contains`, so neither does anything on its own.
 *
 * It finds the keywords by URI, so it works in every dialect with
 * `minContains`, whatever they're named. It has no options.
 */
declare const minMaxContainsWithoutContains: Plugin<JsonSchemaDocumentNode, void>;
export default minMaxContainsWithoutContains;
