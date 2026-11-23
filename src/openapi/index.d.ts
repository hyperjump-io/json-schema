import type { Plugin } from "unified";
import type { Hyperjump, JsonDocumentNode, MediaTypePlugin } from "@hyperjump/browser";
import type { AbsoluteIri } from "@hyperjump/uri";
import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts";

/**
 * An OpenAPI document whose Schema Objects are schemas. Its root is data.
 * Documents are only made for ones without problems.
 */
export type OpenApiDocument = JsonSchemaDocumentNode<"success">;

/**
 * OpenAPI 3.0, 3.1, and 3.2 documents in JSON: `application/openapi+json`,
 * and files named `openapi.json`. Any other JSON document with a top-level
 * `openapi` and no `$schema` dialect is one too, when the session has this
 * plugin. The version is the document's `openapi`.
 *
 * Its Schema Objects are schemas, so `openapi.json#/components/schemas/Pet`
 * compiles. A Schema Object's dialect is `jsonSchemaDialect` (3.1 and
 * later), or the config's `defaultDialects` for the document's URL. Without
 * either, 3.0's is `https://spec.openapis.org/oas/3.0/dialect`, and a 3.1 or
 * 3.2 document with Schema Objects is a problem. The config needs that
 * dialect, and for 3.1 and 3.2, its meta-schema in a registry. Reference
 * Objects aren't followed.
 *
 * Add it to `jsonSchemaConfig`'s `mediaTypes`.
 *
 * ```js
 * const config = jsonSchemaConfig({
 *   dialects: [openApi30Dialect, draft202012Dialect],
 *   vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
 *   registry: new SchemaRegistry().with(openApi31MetaSchema),
 *   defaultDialects: { "./api/openapi.json": "https://spec.openapis.org/oas/3.1/dialect/2024-11-10" },
 *   mediaTypes: [openApiMediaType]
 * });
 * ```
 *
 * @throws SchemaError from `parse`, with every problem in the document
 */
export const openApiMediaType: Readonly<MediaTypePlugin<OpenApiDocument>>;

/**
 * Parse and resolve the text of an OpenAPI document. `dialectUri` is the
 * dialect of its Schema Objects if it doesn't have `jsonSchemaDialect`.
 *
 * @throws SchemaError with every problem in the document
 */
export const parseOpenApi: (text: string, session: Hyperjump<JsonSchemaConfig>, uri: AbsoluteIri, dialectUri?: string) => Promise<OpenApiDocument>;

/**
 * Resolves an OpenAPI document in a unified pipeline, after `rejsonParse`,
 * like `jsonSchemaResolve` does a schema, so its Schema Objects can be
 * linted. Each problem is an error on the file. `dialectUri` is the dialect
 * of its Schema Objects if it doesn't have `jsonSchemaDialect`, like
 * `jsonSchemaResolve`'s.
 */
export const openApiResolve: Plugin<[{ session: Hyperjump<JsonSchemaConfig>; dialectUri?: string }], JsonDocumentNode, JsonSchemaDocumentNode>;

/**
 * OpenAPI's dialect meta-schemas and document schemas, which
 * `https://spec.openapis.org/oas/` serves as `application/octet-stream`.
 * It's a media type plugin for `application/octet-stream` that only reads
 * that site's, as JSON Schema. Anything else is refused as it would be
 * without it. With it in `mediaTypes`, and the site in `allowRetrieval`,
 * OpenAPI 3.1's and 3.2's dialects and its document schemas can be
 * retrieved instead of being in a registry.
 *
 * ```js
 * const config = jsonSchemaConfig({
 *   dialects: [draft202012Dialect],
 *   vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
 *   mediaTypes: [openApiMediaType, openApiSpecMediaType],
 *   allowRetrieval: ["https://spec.openapis.org/oas/"]
 * });
 * ```
 */
export const openApiSpecMediaType: Readonly<MediaTypePlugin<JsonSchemaDocumentNode<"success">>>;

export { resolveOpenApi } from "./resolve.js";
