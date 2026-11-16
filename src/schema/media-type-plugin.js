import { toAbsoluteIri, urlToIri } from "@hyperjump/uri";
import { parse as parseContentType } from "content-type";
import { resolveSchemaText } from "./resolve-text.js";
import { DocumentResponse } from "../registry/document-response.js";

/**
 * @import * as API from "./media-type-plugin.d.ts"
 */

/** @type typeof API.schemaMediaType */
export const schemaMediaType = Object.freeze({
  mediaType: "application/schema+json",
  extensions: [".schema.json"],

  /** @type typeof API.schemaMediaType.parse */
  parse: async (response, session) => {
    // A registry's schema is resolved already
    if (response instanceof DocumentResponse) {
      return /** @type API.JsonSchemaMediaTypeDocument */ (response.document);
    }

    // A schema's identifiers are IRIs, so the response's URL is converted
    // where it comes in
    const uri = toAbsoluteIri(urlToIri(new URL(response.url)));
    const { schema, profile } = contentTypeParameters(response);
    return /** @type API.JsonSchemaMediaTypeDocument */ (await resolveSchemaText(await response.text(), /** @type any */ (session), uri, schema ?? profile));
  }
});

/**
 * The parameters of a response's `Content-Type`. A file's response doesn't
 * have one.
 *
 * @type (response: Response) => Record<string, string | undefined>
 */
export const contentTypeParameters = (response) => {
  const contentType = response.headers.get("content-type");
  return contentType === null ? {} : parseContentType(contentType).parameters;
};
