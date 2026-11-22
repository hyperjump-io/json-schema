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
 * later), or the version's default: `https://spec.openapis.org/oas/3.0/dialect`,
 * `https://spec.openapis.org/oas/3.1/dialect/base`, or
 * `https://spec.openapis.org/oas/3.2/dialect/2026-02-26`. The config needs
 * that dialect, and for 3.1 and 3.2, its meta-schema in a registry.
 * Reference Objects aren't followed.
 *
 * Add it to `jsonSchemaConfig`'s `mediaTypes`.
 *
 * ```js
 * const config = jsonSchemaConfig({ dialects: [openApi30Dialect], mediaTypes: [openApiMediaType] });
 * ```
 *
 * @throws SchemaError from `parse`, with every problem in the document
 */
export const openApiMediaType: Readonly<MediaTypePlugin<OpenApiDocument>>;

/**
 * Parse and resolve the text of an OpenAPI document
 *
 * @throws SchemaError with every problem in the document
 */
export const parseOpenApi: (text: string, session: Hyperjump<JsonSchemaConfig>, uri: AbsoluteIri) => Promise<OpenApiDocument>;

/**
 * Resolves an OpenAPI document in a unified pipeline, after `rejsonParse`,
 * like `jsonSchemaResolve` does a schema, so its Schema Objects can be
 * linted. Each problem is an error on the file.
 */
export const openApiResolve: Plugin<[{ session: Hyperjump<JsonSchemaConfig> }], JsonDocumentNode, JsonSchemaDocumentNode>;

export { resolveOpenApi } from "./resolve.js";
