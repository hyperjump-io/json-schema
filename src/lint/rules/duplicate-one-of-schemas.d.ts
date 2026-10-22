import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `oneOf` that's equal to one before it. A value that matches
 * it matches both, so it fails `oneOf`, which needs exactly one to match.
 * That's rarely what's meant.
 *
 * Schemas are compared as JSON, as `enum` compares values. Schemas that
 * mean the same thing but are written differently, like `true` and `{}`,
 * aren't found. It has no options.
 */
declare const duplicateOneOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default duplicateOneOfSchemas;
