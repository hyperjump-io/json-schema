import { relativeFileUrl } from "@hyperjump/browser";
import { toAbsoluteIri, urlToIri } from "@hyperjump/uri";
import { parse as parseContentType } from "content-type";
import { resolveSchemaText } from "./resolve-text.js";
import { isSession } from "../session.js";
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
    // Resolving a schema can mean retrieving its meta-schema, which belongs
    // to the session
    if (!isSession(session)) {
      throw Error("A schema can only be retrieved in a JsonSchemaHyperjump. Use 'new JsonSchemaHyperjump(config)' to start one.");
    }

    // A registry's schema is resolved already
    if (response instanceof DocumentResponse) {
      return /** @type API.JsonSchemaMediaTypeDocument */ (response.document);
    }

    // A schema's identifiers are IRIs, so the response's URL is converted
    // where it comes in
    const uri = toAbsoluteIri(urlToIri(new URL(response.url)));
    const { schema, profile } = contentTypeParameters(response);
    return /** @type API.JsonSchemaMediaTypeDocument */ (await resolveSchemaText(await response.text(), session, uri, schema ?? profile));
  },

  /**
   * An anchor identifies a JSON Pointer. Otherwise, the fragment is a JSON
   * Pointer that's percent-encoded. A fragment that's neither is an anchor
   * that isn't in the document.
   *
   * @type typeof API.schemaMediaType.fragmentPointer
   */
  fragmentPointer: (document, fragment) => {
    if (Object.hasOwn(document.anchors, fragment)) {
      return document.anchors[fragment];
    }

    const pointer = decodeURIComponent(fragment);
    if (pointer !== "" && !pointer.startsWith("/")) {
      throw Object.assign(Error(`There's no '${fragment}' anchor in '${relativeFileUrl(document.uri)}'`, {
        cause: { code: "ERR_ANCHOR_NOT_FOUND", anchor: fragment }
      }), { url: document.url });
    }

    return pointer;
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
