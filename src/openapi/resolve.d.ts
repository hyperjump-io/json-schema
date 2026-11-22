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
 * later), or the version's default from `defaultDialects`, unless it has
 * `$schema` next to `$id`. 3.0's default is
 * `https://spec.openapis.org/oas/3.0/dialect`. 3.1 and 3.2 have none, so a
 * document without `jsonSchemaDialect` is a problem without one.
 * The document's URI is `$self` (3.2), resolved against `uri`, or `uri`.
 *
 * Problems are returned, not thrown, as `resolveSchema`'s are.
 */
export const resolveOpenApi: (tree: JsonDocumentNode, options: {
  session: Hyperjump<JsonSchemaConfig>;

  /** The URI the document was retrieved from */
  uri: string;

  defaultDialects?: DefaultDialects;
}) => Promise<{
  document: JsonSchemaDocumentNode;
  messages: SchemaMessage[];
}>;

/** A version of OpenAPI, without its patch */
export type OpenApiVersion = "3.0" | "3.1" | "3.2";

/**
 * The dialect URI of Schema Objects in documents without
 * `jsonSchemaDialect`, for each version
 */
export type DefaultDialects = Partial<Record<OpenApiVersion, string>>;

/**
 * Throws a TypeError for a key in `defaultDialects` that isn't a version
 * this reads, like `3.0` written as a number, which is the key "3"
 */
export const assertDefaultDialects: (defaultDialects: DefaultDialects) => void;

/** Whether an `openapi` field is a version this reads */
export const openApiVersion: (version: string) => boolean;

/**
 * The URI of the schema an OpenAPI document of a version, its `openapi`
 * field, is validated against: OpenAPI's latest published `schema` for it,
 * like `https://spec.openapis.org/oas/3.1/schema/2026-11-05`. It only checks
 * that a Schema Object is an object or a boolean, because resolving checks
 * them in their own dialects. It's undefined for a version this doesn't
 * read. The schemas aren't included: retrieve them with
 * `openApiSpecMediaType`, or put them in a registry.
 */
export const openApiSchemaUri: (version: string) => string | undefined;
