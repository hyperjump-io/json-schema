import type { JsonMediaTypeDocument, MediaTypePlugin } from "@hyperjump/browser";
import type { JsonSchemaMediaTypeDocument } from "./media-type-plugin.d.ts";
import type { Hyperjump } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";

/** A JSON document, or a schema document if it's a schema */
export type JsonOrSchemaDocument = JsonMediaTypeDocument | JsonSchemaMediaTypeDocument;

/**
 * JSON that can be a JSON Schema: `application/json`, and files that end
 * with `.json`.
 *
 * A JSON document is a schema if its top-level `$schema` is a dialect: one
 * the session has, or one a meta-schema it can find defines. A meta-schema
 * whose `$schema` is itself is a schema too. Anything else is JSON, the way
 * `@hyperjump/browser`'s `jsonMediaType` parses it. So a schema doesn't have
 * to be a `.schema.json` file or served as `application/schema+json` to be
 * found by its location. A document with a `$schema` that's an instance's
 * schema, rather than a dialect, is JSON, and so is one with a `$schema`
 * that's a file, which can't be a dialect.
 *
 * A JSON document without a `$schema` dialect whose top-level `openapi` is
 * a string is an OpenAPI document, if the session has a plugin for
 * `application/openapi+json`, like `openApiMediaType`, which parses it.
 *
 * Any other JSON document without a top-level `$schema`, at a URL one of
 * the session's `defaultDialects` keys matches, is a schema in that key's
 * dialect, if it is one.
 *
 * A fragment of a schema is a schema's, and a fragment of JSON identifies
 * the whole document, which each document says with its `anchors`.
 *
 * `jsonSchemaMediaTypes` returns it after the JSON Schema media type, and
 * it's what parses JSON. Only a `Hyperjump<JsonSchemaConfig>` reads a document as a
 * schema. It isn't exported from the package.
 */
export const jsonOrSchemaMediaType: Readonly<MediaTypePlugin<JsonOrSchemaDocument>>;
