import { jsonMediaType, mediaTypeForContentType } from "@hyperjump/browser";
import { normalizeIri, toAbsoluteIri, urlToIri } from "@hyperjump/uri";
import { resolveId } from "../identifiers.js";
import { resolveSchemaText } from "./resolve-text.js";
import { contentTypeParameters } from "./media-type-plugin.js";
import { getDialect, hasDialect } from "../session.js";
import { definitionsIn } from "../definition-of.js";
import { defaultDialectFor } from "../default-dialects.js";

/**
 * @import { DocumentSession, MediaTypePlugin } from "@hyperjump/browser"
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
      // The text has been read, so the next plugin gets it as it is
      const source = { text: async () => text, url: response.url, headers: response.headers };
      const openApi = openApiPlugin(text, session);
      if (openApi !== undefined) {
        return /** @type any */ (openApi.parse(/** @type Response */ (source), session));
      }
      const defaultDialect = await keyDialect(text, response.url, session);
      if (defaultDialect !== undefined) {
        return /** @type JsonSchemaMediaTypeDocument */ (await resolveSchemaText(text, defaultDialect.session, uri, defaultDialect.uri));
      }
      return jsonMediaType.parse(source);
    }

    return /** @type JsonSchemaMediaTypeDocument */ (await resolveSchemaText(text, dialectUri.session, uri, contentTypeParameters(response).schema));
  }
});

/**
 * The plugin that reads OpenAPI documents, if the text is one, by its
 * top-level `openapi`, and the session has a plugin for
 * `application/openapi+json`. It's found by the media type, so this
 * doesn't depend on OpenAPI's module, and a session without it reads the
 * document as JSON. Without a plugin of its own, the media type finds this
 * one, by its `+json` suffix.
 *
 * @type (text: string, session: DocumentSession) => MediaTypePlugin | undefined
 */
const openApiPlugin = (text, session) => {
  if (!definitionsIn(session.config) || !text.includes(`"openapi"`)) {
    return;
  }

  try {
    const json = /** @type unknown */ (JSON.parse(text));
    if (typeof json !== "object" || json === null || !("openapi" in json) || typeof json.openapi !== "string") {
      return;
    }
  } catch {
    return;
  }

  const plugin = mediaTypeForContentType(session.config.mediaTypes ?? [], "application/openapi+json");
  return plugin === jsonOrSchemaMediaType ? undefined : plugin;
};

/**
 * The dialect `defaultDialects` gives JSON text at a URL, which makes it a
 * schema, if the text doesn't have a top-level `$schema` and the key's value
 * is a dialect. A `$schema` that isn't a dialect is an instance's schema, so
 * that text is JSON, as it would be without the key.
 *
 * @type (text: string, url: string, session: DocumentSession) => Promise<{ uri: string, session: Hyperjump<JsonSchemaConfig> } | undefined>
 */
const keyDialect = async (text, url, documentSession) => {
  if (!definitionsIn(documentSession.config)) {
    return;
  }
  const session = /** @type Hyperjump<JsonSchemaConfig> */ (/** @type unknown */ (documentSession));
  const dialectUri = defaultDialectFor(session, url);
  if (dialectUri === undefined || hasTopLevel(text, "$schema")) {
    return;
  }

  if (hasDialect(session, dialectUri)) {
    return { uri: dialectUri, session };
  }

  try {
    await getDialect(session, dialectUri, { referencedFrom: url });
    return { uri: dialectUri, session };
  } catch {
    return;
  }
};

/**
 * Whether JSON text's root is an object with this property. Text that isn't
 * JSON doesn't.
 *
 * @type (text: string, name: string) => boolean
 */
const hasTopLevel = (text, name) => {
  if (!text.includes(`"${name}"`)) {
    return false;
  }
  try {
    const json = /** @type unknown */ (JSON.parse(text));
    return typeof json === "object" && json !== null && !Array.isArray(json) && name in json;
  } catch {
    return false;
  }
};

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
