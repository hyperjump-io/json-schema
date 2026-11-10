import { JsonMediaTypePlugin } from "@hyperjump/browser";
import { parse as parseContentType } from "content-type";
import { normalizeIri, toAbsoluteIri, urlToIri } from "@hyperjump/uri";
import { resolveId } from "../identifiers.js";
import { resolveSchemaText } from "./resolve-text.js";
import { JsonSchemaSession } from "../session.js";

/**
 * @import { DocumentNode, MediaTypePlugin } from "@hyperjump/browser"
 * @import { AbsoluteIri } from "@hyperjump/uri"
 * @import * as API from "./json-media-type-plugin.d.ts"
 */

/** @implements API.JsonOrSchemaMediaTypePlugin */
export class JsonOrSchemaMediaTypePlugin {
  #json = new JsonMediaTypePlugin();

  constructor() {
    this.mediaType = "application/json";
    this.extensions = [".json"];
  }

  /** @type MediaTypePlugin<DocumentNode>["parse"] */
  async parse(response, session) {
    const text = await response.text();
    // A schema's identifiers are IRIs, so the response's URL is converted
    // where it comes in
    const uri = toAbsoluteIri(urlToIri(new URL(response.url)));
    const dialectUri = await schemaDialect(text, uri, session);
    if (dialectUri === undefined) {
      // The text has been read, so the JSON plugin gets it as it is
      return this.#json.parse({ text: async () => text, url: response.url });
    }

    const contentType = parseContentType(response.headers.get("content-type") ?? "application/json");
    const document = await resolveSchemaText(text, /** @type JsonSchemaSession */ (session), uri, contentType.parameters.schema);
    /** @type JsonSchemaSession */ (session).addResources(document);
    return /** @type DocumentNode */ (/** @type unknown */ (document));
  }
}

/**
 * The dialect of JSON text that's a schema: its top-level `$schema`, if the
 * session has that dialect or can find a meta-schema that defines it. Text
 * that doesn't mention `$schema` isn't parsed. A meta-schema whose `$schema`
 * is itself describes itself, so it's a schema. A dialect can't be a file.
 *
 * @type (text: string, url: AbsoluteIri, session: unknown) => Promise<string | undefined>
 */
const schemaDialect = async (text, url, session) => {
  if (!(session instanceof JsonSchemaSession) || !text.includes(`"$schema"`)) {
    return;
  }

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

  if (dialectUri === normalizeIri(url) || session.hasDialect(dialectUri)) {
    return dialectUri;
  }

  try {
    await session.getDialect(dialectUri, { referencedFrom: url });
    return dialectUri;
  } catch {
    return;
  }
};
