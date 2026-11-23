import type { Hyperjump } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "./json-schema.d.ts";

/**
 * The dialect the config's `defaultDialects` gives a document at a URL, if
 * any: the key for the URL itself, or else the longest key that ends with
 * `/` and the URL is under. A media type plugin for documents that have
 * schemas in them, like OpenAPI's, uses it for the dialect of their schemas.
 *
 * @throws {TypeError} If a key isn't a URL, or is relative and the session
 *   has no context URL.
 */
export const defaultDialectFor: (session: Hyperjump<JsonSchemaConfig>, url: string) => string | undefined;
