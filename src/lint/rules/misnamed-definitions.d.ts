import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `definitions` in a dialect where the keyword for definitions is `$defs`
 * (2019-09 and 2020-12), or `$defs` where it's `definitions` (draft-04
 * through draft-07). It's an unknown keyword there, so what's in it isn't a
 * schema: it isn't checked, and `reference-without-target` reports a
 * reference to it. 2019-09 and 2020-12's meta-schemas still describe
 * `definitions` so its old use doesn't conflict, and some implementations
 * still treat it as a keyword, but the specs don't.
 *
 * The keyword for definitions is found by its URI in the schema's dialect,
 * so custom dialects are covered too. Dialects where unknown keywords are
 * errors, like v1, aren't reported, because the resolver already is. It has
 * no options.
 */
declare const misnamedDefinitions: Plugin<JsonSchemaDocumentNode, void>;
export default misnamedDefinitions;
