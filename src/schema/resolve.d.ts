import type { Plugin } from "unified";
import type { JsonDocumentNode } from "@hyperjump/browser";
import type { JsonSchemaHyperjump } from "../session.d.ts";
import type { JsonSchemaDocumentNode } from "./schema-ast.d.ts";
import type { SchemaMessage } from "./schema-error.d.ts";

export type JsonSchemaResolveOptions = {
  /**
   * Provides the dialects and keywords. Meta-schemas are retrieved in this
   * session, and dialects built from them belong to it.
   */
  session: JsonSchemaHyperjump;

  /**
   * The dialect to use if the document doesn't have `$schema`, such as the
   * `schema` parameter of a `Content-Type` header. If this isn't given, the
   * `defaultDialectUri` the JSON Schema media types were made with is used.
   */
  dialectUri?: string;
};

/**
 * Turns a JSON AST, like the one browser's `fromJson` gives, into a schema
 * AST. The tree is annotated in place, and it's returned as the document.
 *
 * It determines the dialect of each schema resource, annotates schemas and
 * keywords, and finds embedded resources and anchors. Problems, such as a
 * missing dialect or an invalid `$id`, are returned as errors, because a
 * schema with a problem can't be used. They aren't thrown, so every problem
 * in the document is reported.
 *
 * It's asynchronous because a dialect that isn't in the config has to be
 * retrieved from its meta-schema. It doesn't validate the document against
 * its meta-schema.
 */
export const resolveSchema: (tree: JsonDocumentNode, options: JsonSchemaResolveOptions & { uri: string }) => Promise<{
  document: JsonSchemaDocumentNode;
  messages: SchemaMessage[];
}>;

/**
 * {@link resolveSchema} as a unified plugin, which runs after `rejsonParse`.
 * The base URI defaults to the file's path, and each problem is added to
 * the file as an error (`fatal: true`).
 *
 * The session is put on the file as `file.data.jsonSchemaSession`, so lint
 * rules that run after it can find other schemas the way the document's
 * references would.
 */
export const jsonSchemaResolve: Plugin<[JsonSchemaResolveOptions], JsonDocumentNode, JsonSchemaDocumentNode>;

declare module "vfile" {
  interface DataMap {
    /** The session the schema was resolved in. See {@link jsonSchemaResolve}. */
    jsonSchemaSession: JsonSchemaHyperjump;
  }
}
