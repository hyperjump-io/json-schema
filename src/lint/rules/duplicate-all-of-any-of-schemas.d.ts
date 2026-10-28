import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `allOf` or `anyOf` that's the same as one before it. A value
 * passes it exactly when it passes the first one, so it never changes the
 * result. It may be a copy that was meant to be changed. A duplicate in
 * `oneOf` makes the values it matches fail, which `duplicate-one-of-schemas`
 * reports.
 *
 * Schemas are the same if they mean the same, even written differently:
 * `true` and `{}`, `"const": 1` and `"enum": [1]`, keywords in a different
 * order, and references to the same schema. Their subschemas are compared
 * the same way. Annotations have to be the same, from the same keywords,
 * so schemas that differ only in `title` aren't the same. A schema in
 * another document is the same only as a reference to the same place. It
 * has no options.
 */
declare const duplicateAllOfAnyOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default duplicateAllOfAnyOfSchemas;
