import type { DocumentNode, MediaTypePlugin } from "@hyperjump/browser";
import type { JsonSchema } from "../json-schema.d.ts";

/**
 * Supports JSON that can be a JSON Schema
 * - Media type: application/json
 * - Extensions: .json
 *
 * A JSON document is a schema if its top-level `$schema` is a dialect: one
 * the session has, or one a meta-schema it can find defines. A meta-schema
 * whose `$schema` is itself is a schema too. Anything else is JSON, the way
 * `@hyperjump/browser`'s `JsonMediaTypePlugin`, which this replaces, parses
 * it. So a schema doesn't have to be a `.schema.json` file or served as
 * `application/schema+json` to be found by its location. A document with a
 * `$schema` that's an instance's schema, rather than a dialect, is JSON.
 *
 * It's added to every {@link JsonSchema}. Only a `JsonSchemaSession` reads a
 * document as a schema.
 */
export class JsonOrSchemaMediaTypePlugin implements MediaTypePlugin<DocumentNode> {
  mediaType: string;
  extensions: string[];
  parse: MediaTypePlugin<DocumentNode>["parse"];
}
