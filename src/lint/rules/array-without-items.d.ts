import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * `type: "array"` without `items` in the same schema, in OpenAPI 3.0, which
 * says `items` MUST be present. Without it, every item is valid, which is
 * what it means in JSON Schema, so the schema is still understood and it's
 * lint. An `items` in another schema, like one in an `allOf`, doesn't
 * count. It has no options.
 */
declare const arrayWithoutItems: Plugin<JsonSchemaDocumentNode, void>;
export default arrayWithoutItems;
