import type { MediaTypePlugin } from "@hyperjump/browser";
import type { JsonSchemaDocumentNode } from "./schema-ast.d.ts";
import type { Hyperjump } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";

/**
 * Documents are only made for schemas without problems, so their status is
 * always `success`.
 */
export type JsonSchemaMediaTypeDocument = JsonSchemaDocumentNode<"success">;

/**
 * JSON Schema: `application/schema+json`, and files that end with
 * `.schema.json`.
 *
 * The `schema` parameter of the media type (or `profile`, which was used
 * before 2020-12) is the dialect of a schema that doesn't have `$schema`.
 *
 * A fragment is an anchor, or a JSON Pointer that's percent-encoded.
 * `fragmentPointer` throws an `Error` whose `cause.code` is
 * `ERR_ANCHOR_NOT_FOUND`, with the `anchor`, if the fragment isn't an
 * anchor in the document or a JSON Pointer. Its `url` is the resource's.
 *
 * `jsonSchemaMediaTypes` makes it with the definitions schemas are read
 * with. A schema can only be retrieved in a `Hyperjump<JsonSchemaConfig>`: `parse`
 * throws in any other session. It isn't exported from the package.
 */
export const schemaMediaType: Readonly<MediaTypePlugin<JsonSchemaMediaTypeDocument>> & Required<Pick<MediaTypePlugin<JsonSchemaMediaTypeDocument>, "fragmentPointer">>;

// Used by the library. It isn't exported from the package.
export const contentTypeParameters: (response: Response) => Record<string, string | undefined>;
