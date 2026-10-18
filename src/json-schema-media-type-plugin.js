import { parse as parseContentType } from "content-type";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { toAbsoluteIri } from "@hyperjump/uri";
import { jsonSchemaResolve } from "./jsonschema-resolve.js";
import { jsonSchemaValidateKeywords } from "./jsonschema-validate-keywords.js";
import { JsonSchemaSession } from "./json-schema.js";

/**
 * @import { MediaTypePlugin } from "@hyperjump/browser"
 * @import { JsonSchema } from "./json-schema.d.ts"
 * @import { JsonSchemaDocumentNode } from "./schema-ast.d.ts"
 */

/**
 * Supports JSON Schema
 * - Media type: application/schema+json
 * - Extensions: .schema.json
 *
 * The `schema` parameter of the media type (or `profile`, which was used
 * before 2020-12) is the dialect of a schema that doesn't have `$schema`.
 *
 * @implements MediaTypePlugin<JsonSchemaDocumentNode<"success">>
 */
export class JsonSchemaMediaTypePlugin {
  /** @type JsonSchema */
  #jsonSchema;

  /** @type (uri: string) => boolean */
  #isValueSchema;

  /**
   * @param {JsonSchema} jsonSchema
   * @param {(uri: string) => boolean} isValueSchema - Whether a document is a
   * keyword's value schema. Those aren't validated.
   */
  constructor(jsonSchema, isValueSchema) {
    this.mediaType = "application/schema+json";
    this.extensions = [".schema.json"];

    this.#jsonSchema = jsonSchema;
    this.#isValueSchema = isValueSchema;
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

    // Value schemas aren't validated, or validating one would need itself
    if (this.#jsonSchema.config.validateSchemas !== false && !this.#isValueSchema(toAbsoluteIri(response.url))) {
      processor.use(jsonSchemaValidateKeywords, { jsonSchema: this.#jsonSchema });
    }
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
