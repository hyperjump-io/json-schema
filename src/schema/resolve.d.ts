import type { Plugin } from "unified";
import type { JsonDocumentNode, JsonErrorNode, JsonNode } from "@hyperjump/browser";
import type { JsonSchemaDocumentNode } from "./schema-ast.d.ts";
import type { SchemaMessage } from "./schema-error.d.ts";
import type { Hyperjump } from "@hyperjump/browser";
import type { JsonSchemaConfig } from "../json-schema.d.ts";

export type JsonSchemaResolveOptions = {
  /**
   * Provides the dialects and keywords. Meta-schemas are retrieved in this
   * session, and dialects built from them belong to it.
   */
  session: Hyperjump<JsonSchemaConfig>;

  /**
   * The dialect to use if the document doesn't have `$schema`, such as the
   * `schema` parameter of a `Content-Type` header, or the config's
   * `defaultDialects` for its URL. Without one, a schema without `$schema`
   * is an error.
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
 * Resolve one node as a schema, in a document that isn't a schema at its
 * root, like a Schema Object in an OpenAPI document. The document is the
 * resource it's in, made by the caller, and the node is annotated in place,
 * like {@link resolveSchema}'s tree. Resources it embeds, with `$id`, are
 * added to the document's `embedded`. It isn't a resource's root, so
 * `$schema` is only allowed next to `$id`. The problems are returned, as
 * {@link resolveSchema}'s are.
 */
export const resolveSchemaAt: (node: JsonNode | JsonErrorNode, options: {
  session: Hyperjump<JsonSchemaConfig>;

  /** The resource the node is in, with `embedded` that the caller shares */
  document: JsonSchemaDocumentNode;

  /** The node's JSON Pointer from the resource's root */
  pointer: string;

  /** Its dialect, unless it has `$schema` next to `$id` */
  dialectUri: string;

  /** The URI the document was retrieved from, for messages and for what it may refer to */
  uri: string;
}) => Promise<SchemaMessage[]>;

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
    jsonSchemaSession: Hyperjump<JsonSchemaConfig>;
  }
}
