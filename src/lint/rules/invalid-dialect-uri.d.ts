import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A v1 `$schema` with a fragment, even an empty one, or that isn't
 * normalized, like `HTTPS://json-schema.org/v1#`. v1 doesn't allow either.
 * This implementation recovers, but other implementations may not
 * recognize the dialect, so it's an error in the recommended preset.
 * `non-canonical-dialect-uri` reports these too, and in other dialects, as
 * warnings.
 * It has no options.
 */
declare const invalidDialectUri: Plugin<JsonSchemaDocumentNode, void>;
export default invalidDialectUri;
