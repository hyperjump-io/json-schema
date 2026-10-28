import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `oneOf` that's the same as one before it. A value that
 * matches it matches both, so it fails `oneOf`, which needs exactly one to
 * match. That's rarely what's meant.
 *
 * Schemas are the same if they mean the same, even written differently:
 * `true` and `{}`, `"type": "string"` and `"type": ["string"]`, keywords
 * in a different order, and references to the same schema. Their
 * subschemas are compared the same way. Annotations have to be the same,
 * from the same keywords, so schemas that differ only in `title` aren't
 * the same. A schema in another document is the same only as a reference
 * to the same place. It has no options.
 */
declare const duplicateOneOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default duplicateOneOfSchemas;
