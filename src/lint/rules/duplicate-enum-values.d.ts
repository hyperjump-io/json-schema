import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A value in `enum` that's equal to one before it. It has no effect, and it
 * may be a typo for a value that's missing. Values are compared as JSON
 * Schema does: objects without regard to property order, and `1` and `1.0`
 * are equal. Each duplicate is reported.
 *
 * Draft-04's meta-schema doesn't allow duplicates, but the schema still
 * works, so it's reported in every dialect. It has no options.
 */
declare const duplicateEnumValues: Plugin<JsonSchemaDocumentNode, void>;
export default duplicateEnumValues;
