import { parse as parseContentType } from "content-type";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { jsonSchemaResolve } from "./resolve.js";
import { JsonSchemaSession } from "../session.js";

/**
 * @import { MediaTypePlugin } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode } from "./schema-ast.d.ts"
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

    const file = new VFile(await response.text());
    const processor = unified()
      .use(rejsonParse)
      .use(jsonSchemaResolve, { session, uri: response.url, dialectUri });
    const document = await processor.run(processor.parse(file), file);

    // A schema with problems can't be used reliably, so any problem is fatal
    if (file.messages.length > 0) {
      const message = file.messages[0];
      message.fatal = true;
      throw message;
    }

    return /** @type JsonSchemaDocumentNode<"success"> */ (document);
  }

  /**
   * An anchor identifies a JSON Pointer. Otherwise, the fragment is a JSON
   * Pointer that's percent-encoded.
   *
   * @type NonNullable<MediaTypePlugin<JsonSchemaDocumentNode<"success">>["fragmentPointer"]>
   */
  fragmentPointer(document, fragment) {
    return Object.hasOwn(document.anchors, fragment)
      ? document.anchors[fragment]
      : decodeURIComponent(fragment);
  }
}
