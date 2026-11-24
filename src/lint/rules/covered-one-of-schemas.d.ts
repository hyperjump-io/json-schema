import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A schema in `oneOf` that allows nothing another schema in it doesn't,
 * like `"type": "integer"` next to `"type": "number"`. A value that matches
 * it matches both, so it fails `oneOf`, which needs exactly one to match.
 * Every integer fails there. `anyOf` is usually what was meant, or the
 * other schema was meant to leave those values out.
 *
 * Schemas are compared as `redundant-all-of-any-of-schemas` compares them,
 * by what they mean as far as that's known without trying values, so it
 * doesn't find every such schema, but the ones it reports are. Two schemas
 * that allow the same are both reported, and `duplicate-one-of-schemas`
 * reports the later one too. A schema that allows nothing, like `false`,
 * isn't reported, because it has no values to fail. It has no options.
 */
declare const coveredOneOfSchemas: Plugin<JsonSchemaDocumentNode, void>;
export default coveredOneOfSchemas;
