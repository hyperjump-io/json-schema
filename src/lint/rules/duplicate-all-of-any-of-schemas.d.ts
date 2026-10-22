import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `allOf` or `anyOf` that's equal to one before it. A value
 * passes it exactly when it passes the first one, so it never changes the
 * result. It may be a copy that was meant to be changed. A duplicate in
 * `oneOf` makes the values it matches fail, which `duplicate-one-of-schemas`
 * reports.
 *
 * Schemas are compared as JSON, as `enum` compares values. Schemas that
 * mean the same thing but are written differently, like `true` and `{}`,
 * aren't found. It has no options.
 */
declare const duplicateAllOfAnyOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default duplicateAllOfAnyOfSchemas;
