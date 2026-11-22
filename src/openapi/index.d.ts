import type { Plugin } from "unified";
import type { Hyperjump, JsonDocumentNode, MediaTypePlugin } from "@hyperjump/browser";
import type { AbsoluteIri } from "@hyperjump/uri";
import type { JsonSchemaConfig } from "../json-schema.d.ts";
import type { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts";
import type { DefaultDialects } from "./resolve.d.ts";

/**
 * An OpenAPI document whose Schema Objects are schemas. Its root is data.
 * Documents are only made for ones without problems.
 */
export type OpenApiDocument = JsonSchemaDocumentNode<"success">;

export type OpenApiMediaTypePlugin = Readonly<MediaTypePlugin<OpenApiDocument>>;

export type OpenApiOptions = {
  /**
   * The dialect of Schema Objects in documents without `jsonSchemaDialect`,
   * for each version. 3.0's is `https://spec.openapis.org/oas/3.0/dialect`
   * unless it's given. 3.1 and 3.2 have none, so a document of that version
   * without `jsonSchemaDialect` is a problem.
   */
  defaultDialects?: DefaultDialects;
};

/**
 * OpenAPI 3.0, 3.1, and 3.2 documents in JSON: `application/openapi+json`,
 * and files named `openapi.json`. Any other JSON document with a top-level
 * `openapi` and no `$schema` dialect is one too, when the session has this
 * plugin. The version is the document's `openapi`.
 *
 * Its Schema Objects are schemas, so `openapi.json#/components/schemas/Pet`
 * compiles. A Schema Object's dialect is `jsonSchemaDialect` (3.1 and
 * later), or the version's default from `defaultDialects`. The config needs
 * that dialect, and for 3.1 and 3.2, its meta-schema in a registry.
 * Reference Objects aren't followed.
 *
 * Add it to `jsonSchemaConfig`'s `mediaTypes`.
 *
 * ```js
 * const config = jsonSchemaConfig({
 *   dialects: [openApi30Dialect, draft202012Dialect],
 *   vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
 *   registry: new SchemaRegistry().with(openApi31MetaSchema),
 *   mediaTypes: [openApiMediaType({
 *     defaultDialects: { "3.1": "https://spec.openapis.org/oas/3.1/dialect/base" }
 *   })]
 * });
 * ```
 *
 * @throws SchemaError from `parse`, with every problem in the document
 */
export const openApiMediaType: (options?: OpenApiOptions) => OpenApiMediaTypePlugin;

/**
 * Parse and resolve the text of an OpenAPI document
 *
 * @throws SchemaError with every problem in the document
 */
export const parseOpenApi: (text: string, session: Hyperjump<JsonSchemaConfig>, uri: AbsoluteIri, options?: OpenApiOptions) => Promise<OpenApiDocument>;

/**
 * Resolves an OpenAPI document in a unified pipeline, after `rejsonParse`,
 * like `jsonSchemaResolve` does a schema, so its Schema Objects can be
 * linted. Each problem is an error on the file. Give it the same
 * `defaultDialects` as `openApiMediaType`.
 */
export const openApiResolve: Plugin<[{ session: Hyperjump<JsonSchemaConfig> } & OpenApiOptions], JsonDocumentNode, JsonSchemaDocumentNode>;

/**
 * OpenAPI's dialect meta-schemas and document schemas, which
 * `https://spec.openapis.org/oas/` serves as `application/octet-stream`.
 * It's a media type plugin for `application/octet-stream` that only reads
 * that site's, as JSON Schema. Anything else is refused as it would be
 * without it. With it in `mediaTypes`, and the site in `allowRetrieval`,
 * OpenAPI 3.1's and 3.2's dialects and the schemas from `openApiSchemaUri`
 * can be retrieved instead of being in a registry.
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

export { openApiSchemaUri, resolveOpenApi } from "./resolve.js";
export type { DefaultDialects, OpenApiVersion } from "./resolve.d.ts";
