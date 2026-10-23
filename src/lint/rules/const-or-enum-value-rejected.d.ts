import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A value in `enum` that an assertion next to it rejects, like `5` in
 * `enum: [10, 5]` next to `multipleOf: 2`, so it's never valid, or a `const`
 * value that one rejects, so nothing is valid. Each value is reported once,
 * with every assertion that rejects it.
 *
 * It checks the same assertions as `assertion-implied-by-const-or-enum`. A
 * value that `type` doesn't allow is reported by
 * `const-or-enum-value-for-disallowed-type`.
 *
 * It compiles a schema for each assertion next to a `const` or `enum`, so
 * it can be expensive on large schemas, and it isn't in `recommended`.
 * It has no options.
 */
declare const constOrEnumValueRejected: Plugin<JsonSchemaDocumentNode, void>;
export default constOrEnumValueRejected;
