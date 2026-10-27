import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `then` or `else` that every value is valid against and that has no
 * annotations: `true`, `{}`, or a schema with nothing but `$comment`. It
 * never fails and adds nothing, so it's likely unfinished. A schema with
 * annotations, like `description`, isn't reported, because the annotations
 * apply only when the branch does.
 *
 * Without `if`, `then-else-without-if` reports it too. It has no options.
 */
declare const emptyThenElse: Plugin<JsonSchemaDocumentNode, void>;
export default emptyThenElse;
