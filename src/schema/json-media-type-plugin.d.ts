import type { JsonMediaTypeDocument, MediaTypePlugin } from "@hyperjump/browser";
import type { JsonSchema } from "../json-schema.d.ts";
import type { JsonSchemaMediaTypeDocument } from "./media-type-plugin.d.ts";

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
 * A fragment of a schema is a schema's, and a fragment of JSON identifies
 * the whole document.
 *
 * It's in every {@link JsonSchema}'s `mediaTypes`, before the config's, so
 * it's what parses JSON. Only a session of a `JsonSchema` reads a document
 * as a schema.
 */
export const jsonOrSchemaMediaType: Readonly<MediaTypePlugin<JsonOrSchemaDocument>> & Required<Pick<MediaTypePlugin<JsonOrSchemaDocument>, "fragmentPointer">>;
