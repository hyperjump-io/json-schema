import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `discriminator` in an OpenAPI document whose schema has no `oneOf`,
 * `anyOf`, or `allOf`, and that no `allOf` entry in the document refers to.
 * OpenAPI says a Discriminator Object "is legal only when using one of the
 * composite keywords `oneOf`, `anyOf`, `allOf`", or in a parent schema that
 * other schemas build on with `allOf`. A schema in a file of its own isn't
 * reported, because the schemas that build on it can be in other documents.
 * It has no options.
 */
declare const discriminatorWithoutComposition: Plugin<JsonSchemaDocumentNode, void>;
export default discriminatorWithoutComposition;
