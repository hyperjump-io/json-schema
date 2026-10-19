import type { MediaTypePlugin } from "@hyperjump/browser";
import type { JsonSchema } from "../json-schema.d.ts";
import type { JsonSchemaDocumentNode } from "./schema-ast.d.ts";

/**
 * Supports JSON Schema
 * - Media type: application/schema+json
 * - Extensions: .schema.json
 *
 * The `schema` parameter of the media type (or `profile`, which was used
 * before 2020-12) is the dialect of a schema that doesn't have `$schema`.
 *
 * It's added to every {@link JsonSchema}. A schema can only be retrieved in a
 * `JsonSchemaSession`.
 */
export class JsonSchemaMediaTypePlugin implements MediaTypePlugin<JsonSchemaDocumentNode<"success">> {
  constructor(jsonSchema: JsonSchema);

  mediaType: string;
  extensions: string[];
  parse: MediaTypePlugin<JsonSchemaDocumentNode<"success">>["parse"];

  /**
   * An anchor identifies a JSON Pointer. Otherwise, the fragment is a JSON
   * Pointer that's percent-encoded.
   */
  fragmentPointer: NonNullable<MediaTypePlugin<JsonSchemaDocumentNode<"success">>["fragmentPointer"]>;
}
