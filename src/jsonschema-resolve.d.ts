import type { Plugin } from "unified";
import type { JsonDocumentNode } from "@hyperjump/browser/json";
import type { JsonSchema, JsonSchemaSession } from "./json-schema.d.ts";
import type { JsonSchemaDocumentNode } from "./schema-ast.d.ts";

export type JsonSchemaResolveOptions = {
  /**
   * Provides the dialects and keywords. Meta-schemas are retrieved in this
   * session, and dialects built from them belong to it.
   */
  session: JsonSchemaSession;

  /**
   * The document's base URI. Defaults to the file's path as a `file:` URI.
   */
  uri?: string;

  /**
   * The dialect to use if the document doesn't have `$schema`, such as the
   * `schema` parameter of a `Content-Type` header. If this isn't given, the
   * `defaultDialectUri` of the {@link JsonSchema} config is used.
   */
  dialectUri?: string;
};

/**
 * Turns a JSON AST into a schema AST. This runs after `rejsonParse`.
 *
 * It determines the dialect of each schema resource, annotates schemas and
 * keywords, and finds embedded resources and anchors. Problems, such as a
 * missing dialect or an invalid `$id`, are added to the file as messages.
 *
 * It's asynchronous because a dialect that hasn't been added has to be
 * retrieved from its meta-schema. It doesn't validate the document against
 * its meta-schema.
 */
export const jsonSchemaResolve: Plugin<[JsonSchemaResolveOptions], JsonDocumentNode, JsonSchemaDocumentNode>;
