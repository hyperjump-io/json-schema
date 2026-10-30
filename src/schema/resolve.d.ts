import type { Plugin } from "unified";
import type { JsonDocumentNode } from "@hyperjump/browser/json";
import type { JsonSchema } from "../json-schema.d.ts";
import type { JsonSchemaSession } from "../session.d.ts";
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
 * missing dialect or an invalid `$id`, are added to the file as errors
 * (`fatal: true`), because a schema with a problem can't be used. They
 * aren't thrown, so every problem in the document is reported.
 *
 * It's asynchronous because a dialect that isn't in the config has to be
 * retrieved from its meta-schema. It doesn't validate the document against
 * its meta-schema.
 *
 * The session is put on the file as `file.data.jsonSchemaSession`, so lint
 * rules that run after it can find other schemas the way the document's
 * references would.
 */
export const jsonSchemaResolve: Plugin<[JsonSchemaResolveOptions], JsonDocumentNode, JsonSchemaDocumentNode>;

declare module "vfile" {
  interface DataMap {
    /** The session the schema was resolved in. See {@link jsonSchemaResolve}. */
    jsonSchemaSession: JsonSchemaSession;
  }
}
