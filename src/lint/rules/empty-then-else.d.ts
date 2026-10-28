import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `then` or `else` that every value is valid against and that does nothing
 * else: no annotations, and nothing marked as evaluated, like `true`, `{}`,
 * a schema with nothing but `$comment`, or one whose keywords do nothing,
 * like `properties: {}`. A reference to such a schema is too. It never fails
 * and adds nothing, so it's likely unfinished. A schema with annotations,
 * like `description`, isn't reported, because the annotations apply only
 * when the branch does.
 *
 * It's the same for any schema that's applied when a condition passes, or
 * when none does: v1's `conditional`, and `dependentSchemas`. Those are
 * reported as "this schema". Without `if`, `then` and `else` aren't
 * branches, and `then-else-without-if` reports them. It has no options.
 */
declare const emptyThenElse: Plugin<JsonSchemaDocumentNode, void>;
export default emptyThenElse;
