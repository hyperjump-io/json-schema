import type { Plugin } from "unified-lint-rule";
import type { JsonSchemaDocumentNode } from "../../schema/schema-ast.d.ts";

/**
 * A `discriminator` whose `propertyName` is optional. OpenAPI 3.0.4 and
 * 3.1.1 say the property SHOULD be required, because what a discriminator
 * does without it is undefined. 3.2 says it MAY be optional, but then the
 * Discriminator Object MUST include a `defaultMapping` for objects without
 * it, so 3.2's is only reported without one. The presets give it its
 * severity: a warning in `openapi-3-0` and `openapi-3-1`, and an error in
 * `openapi-3-2`.
 *
 * A property is required if every object that's valid against the schema
 * with the `discriminator` has it: `required` next to it counts, and so
 * does every `oneOf` alternative requiring it. An alternative in a
 * document that can't be retrieved is taken to allow any properties. It
 * has no options.
 */
declare const discriminatorPropertyOptional: Plugin<JsonSchemaDocumentNode, void>;
export default discriminatorPropertyOptional;
