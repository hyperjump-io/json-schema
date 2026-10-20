import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `then` or `else` without a sibling `if`. Neither does anything on its own,
 * so the schema doesn't do what it seems to.
 *
 * It finds the keywords by URI, so it works in every dialect with `if`,
 * whatever they're named. It has no options.
 */
declare const thenElseWithoutIf: Plugin<JsonSchemaDocumentNode, void>;
export default thenElseWithoutIf;
