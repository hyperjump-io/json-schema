import { relativeFileUri } from "@hyperjump/browser";
import { parse as parseContentType } from "content-type";
import { resolveSchemaText } from "./resolve-text.js";
import { JsonSchemaSession } from "../session.js";

/**
 * @import { MediaTypePlugin } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode } from "./schema-ast.d.ts"
 * @import { Iri } from "@hyperjump/uri"
 * @import * as API from "./media-type-plugin.d.ts"
 */

/** @implements API.JsonSchemaMediaTypePlugin */
export class JsonSchemaMediaTypePlugin {
  constructor() {
    this.mediaType = "application/schema+json";
    this.extensions = [".schema.json"];
  }

  /** @type MediaTypePlugin<JsonSchemaDocumentNode<"success">>["parse"] */
  async parse(response, session) {
    // Resolving a schema can mean retrieving its meta-schema, which belongs
    // to the session
    if (!(session instanceof JsonSchemaSession)) {
      throw Error("A schema can only be retrieved in a JsonSchemaSession. Use the 'session' function of a JsonSchema to create one.");
    }

    const contentType = parseContentType(response.headers.get("content-type") ?? "");
    const dialectUri = contentType.parameters.schema ?? contentType.parameters.profile;

    const document = await resolveSchemaText(await response.text(), session, response.url, dialectUri);
    return /** @type JsonSchemaDocumentNode<"success"> */ (document);
  }

  /**
   * An anchor identifies a JSON Pointer. Otherwise, the fragment is a JSON
   * Pointer that's percent-encoded. A fragment that's neither is an anchor
   * that isn't in the document.
   *
   * @type NonNullable<MediaTypePlugin<JsonSchemaDocumentNode<"success">>["fragmentPointer"]>
   */
  fragmentPointer(document, fragment) {
    if (Object.hasOwn(document.anchors, fragment)) {
      return document.anchors[fragment];
    }

    const pointer = decodeURIComponent(fragment);
    if (pointer !== "" && !pointer.startsWith("/")) {
      throw new AnchorNotFoundError(fragment, document.uri);
    }

    return pointer;
  }
}

/** @implements API.AnchorNotFoundError */
export class AnchorNotFoundError extends Error {
  /**
   * @param {string} anchor
   * @param {Iri} uri
   */
  constructor(anchor, uri) {
    super(`There's no '${anchor}' anchor in '${relativeFileUri(uri)}'`);
    this.name = this.constructor.name;
    this.anchor = anchor;
    this.uri = uri;
  }
}
