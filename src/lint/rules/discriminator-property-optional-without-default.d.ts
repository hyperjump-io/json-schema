import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * An OpenAPI 3.2 `discriminator` without `defaultMapping` whose
 * `propertyName` is optional. 3.2 says that when the discriminating
 * property is optional, the Discriminator Object MUST include a
 * `defaultMapping` for objects without it. A property is required if every
 * object that's valid against the schema with the `discriminator` has it:
 * `required` next to it counts, and so does every `oneOf` alternative
 * requiring it. An alternative in a document that can't be retrieved is
 * taken to allow any properties. It has no options.
 */
declare const discriminatorPropertyOptionalWithoutDefault: Plugin<JsonSchemaDocumentNode, void>;
export default discriminatorPropertyOptionalWithoutDefault;
