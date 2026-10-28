import { JsonMediaTypePlugin } from "@hyperjump/browser";
import { parse as parseContentType } from "content-type";
import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { resolveSchemaText } from "./resolve-text.js";
import { JsonSchemaSession } from "../session.js";

/**
 * @import { DocumentNode, MediaTypePlugin } from "@hyperjump/browser"
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
    const dialectUri = await schemaDialect(text, response.url, session);
    if (dialectUri === undefined) {
      return this.#json.parse(new Response(text));
    }

    const contentType = parseContentType(response.headers.get("content-type") ?? "application/json");
    const document = await resolveSchemaText(text, /** @type JsonSchemaSession */ (session), response.url, contentType.parameters.schema);
    return /** @type DocumentNode */ (/** @type unknown */ (document));
  }
}

/**
 * The dialect of JSON text that's a schema: its top-level `$schema`, if the
 * session has that dialect or can find a meta-schema that defines it. Text
 * that doesn't mention `$schema` isn't parsed. A meta-schema whose `$schema`
 * is itself describes itself, so it's a schema.
 *
 * @type (text: string, url: string, session: unknown) => Promise<string | undefined>
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
    dialectUri = toAbsoluteIri(resolveIri(json.$schema, url));
  } catch {
    return;
  }

  if (dialectUri === toAbsoluteIri(url) || session.hasDialect(dialectUri)) {
    return dialectUri;
  }

  try {
    await session.getDialect(dialectUri, { referencedFrom: url });
    return dialectUri;
  } catch {
    return;
  }
};
