import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A value in `enum` that a keyword next to it rejects, like `5` in
 * `enum: [10, 5]` next to `multipleOf: 2`, so it's never valid, or a `const`
 * value that one rejects, so nothing is valid. Each value is reported once,
 * with every keyword that rejects it.
 *
 * It checks the same keywords as `keyword-implied-by-const-or-enum`,
 * including ones that apply schemas, like `properties` and `anyOf`. A value
 * a keyword might reject isn't reported, like one a reference that can't be
 * followed decides. A value that `type` doesn't allow is reported by
 * `const-or-enum-value-for-disallowed-type`.
 *
 * It has no options.
 */
declare const constOrEnumValueRejected: Plugin<JsonSchemaDocumentNode, void>;
export default constOrEnumValueRejected;
