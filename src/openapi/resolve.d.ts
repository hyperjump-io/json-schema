import type { Hyperjump, JsonDocumentNode } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts";
import type { SchemaMessage } from "../schema/schema-error.d.ts";

/**
 * Turns the JSON AST of an OpenAPI document into a schema AST whose root is
 * data and whose Schema Objects are schemas. The tree is annotated in place.
 *
 * The version is the root's `openapi`. The Objects of that version are
 * walked to find the Schema Objects, without following Reference Objects,
 * and each is resolved by the JSON Schema resolver in the document's
 * resource. A Schema Object's dialect is `jsonSchemaDialect` (3.1 and
 * later), or the version's default, unless it has `$schema` next to `$id`.
 * The document's URI is `$self` (3.2), resolved against `uri`, or `uri`.
 *
 * Problems are returned, not thrown, as `resolveSchema`'s are.
 */
export const resolveOpenApi: (tree: JsonDocumentNode, options: {
  session: Hyperjump<JsonSchemaConfig>;

  /** The URI the document was retrieved from */
  uri: string;
}) => Promise<{
  document: JsonSchemaDocumentNode;
  messages: SchemaMessage[];
}>;

/** Whether an `openapi` field is a version this reads */
export const openApiVersion: (version: string) => boolean;
