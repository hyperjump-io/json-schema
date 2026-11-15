import { jsonMediaType } from "@hyperjump/browser";
import { normalizeIri, toAbsoluteIri, urlToIri } from "@hyperjump/uri";
import { resolveId } from "../identifiers.js";
import { resolveSchemaText } from "./resolve-text.js";
import { contentTypeParameters, schemaMediaType } from "./media-type-plugin.js";
import { getDialect, hasDialect } from "../session.js";
import { definitionsIn } from "../definition-of.js";

/**
 * @import { DocumentSession } from "@hyperjump/browser"
 * @import { AbsoluteIri } from "@hyperjump/uri"
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { JsonSchemaMediaTypeDocument } from "./media-type-plugin.d.ts"
 * @import * as API from "./json-media-type-plugin.d.ts"
 */

/** @type typeof API.jsonOrSchemaMediaType */
export const jsonOrSchemaMediaType = Object.freeze({
  mediaType: "application/json",
  extensions: [".json"],

  /** @type typeof API.jsonOrSchemaMediaType.parse */
  parse: async (response, session) => {
    const text = await response.text();
    // A schema's identifiers are IRIs, so the response's URL is converted
    // where it comes in
    const uri = toAbsoluteIri(urlToIri(new URL(response.url)));
    // The dialect itself is found again when the schema is resolved
    const dialectUri = await schemaDialect(text, uri, session);
    if (dialectUri === undefined) {
      // The text has been read, so the JSON plugin gets it as it is
      return jsonMediaType.parse({ text: async () => text, url: response.url });
    }

    return /** @type JsonSchemaMediaTypeDocument */ (await resolveSchemaText(text, dialectUri.session, uri, contentTypeParameters(response).schema));
  },

  /**
   * A schema's fragments are a schema's, and JSON's identify the whole
   * document
   *
   * @type typeof API.jsonOrSchemaMediaType.fragmentPointer
   */
  fragmentPointer: (document, fragment) => document.type === "json-schema-document"
    ? schemaMediaType.fragmentPointer(/** @type JsonSchemaMediaTypeDocument */ (/** @type unknown */ (document)), fragment)
    : ""
});

/**
 * The dialect of JSON text that's a schema: its top-level `$schema`, if the
 * session has that dialect or can find a meta-schema that defines it. Text
 * that doesn't mention `$schema` isn't parsed. A meta-schema whose `$schema`
 * is itself describes itself, so it's a schema. A dialect can't be a file.
 *
 * It's given with the session, if the session's config has the JSON Schema
 * definitions. Without them, it's JSON.
 *
 * @type (text: string, url: AbsoluteIri, session: DocumentSession) => Promise<{ uri: string, session: Hyperjump<JsonSchemaConfig> } | undefined>
 */
const schemaDialect = async (text, url, documentSession) => {
  if (!definitionsIn(documentSession.config) || !text.includes(`"$schema"`)) {
    return;
  }
  // Browser gives a plugin the session that's retrieving, which is a
  // `Hyperjump`
  const session = /** @type Hyperjump<JsonSchemaConfig> */ (/** @type unknown */ (documentSession));

  let dialectUri;
  try {
    const json = /** @type unknown */ (JSON.parse(text));
    if (typeof json !== "object" || json === null || !("$schema" in json) || typeof json.$schema !== "string") {
      return;
    }
    dialectUri = resolveId(json.$schema, url);
  } catch {
    return;
  }

  // A dialect can't be a file, so a `$schema` that's a file, like
  // `./schema.json` in an instance, is an instance's schema
  if (/^file:/i.test(dialectUri)) {
    return;
  }

  if (dialectUri === normalizeIri(url) || hasDialect(session, dialectUri)) {
    return { uri: dialectUri, session };
  }

  try {
    await getDialect(session, dialectUri, { referencedFrom: url });
    return { uri: dialectUri, session };
  } catch {
    return;
  }
};
