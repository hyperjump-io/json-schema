import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `then` or `else` that's `false`, where a simpler schema says the same
 * thing, or where nothing is valid.
 *
 * - `if` with `then: false` and no `else`: a value is valid only if it fails
 *   `if`, which is `not` with the `if` schema.
 * - `if` with `else: false` and no `then`: a value is valid only if it
 *   passes `if`, which is the `if` schema on its own.
 * - `then` and `else` both `false`: nothing is valid, whatever `if` says.
 *
 * With the other branch too, the rewrite isn't as simple, so only both
 * being `false` is reported. Without `if`, `then-else-without-if` reports
 * them instead. It has no options.
 */
declare const falseThenElse: Plugin<JsonSchemaDocumentNode, void>;
export default falseThenElse;
