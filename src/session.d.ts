import type { Hyperjump, Json } from "@hyperjump/browser";
import type { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Dialect } from "./dialect.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchemaConfig } from "./json-schema.d.ts";

export type SessionOptions = {
  /**
   * Schemas only this call sees, in addition to the config's `registry`.
   * The call sees the two as one registry, so a schema in either can use a
   * dialect defined by a meta-schema in the other.
   */
  registry?: SchemaRegistry<any>;

  /**
   * What this call can retrieve, instead of the config's `allowRetrieval`.
   * It's for an application that allows different things for different
   * calls, such as the files in different folders of a project. It replaces
   * the config's rather than adding to it, so a call can allow less. To
   * allow what the config allows too, include its entries.
   */
  allowRetrieval?: string[];
};

// A session for retrieving and browsing schemas is browser's: a `Hyperjump`
// made from a config with the JSON Schema media types,
// `new Hyperjump(config)`. Everything resolved belongs to it: the documents
// it retrieves and the dialects it builds from meta-schemas. It's for
// browsing and unified pipelines (`jsonSchemaResolve`).
// Operations, like `validator` and `bundle`, start a session of their own.
//
// A config's `registry` is a `SchemaRegistry`, which the session asks before
// anything is retrieved, so `allowRetrieval` doesn't apply to a registry's
// schema.
//
// A reference can lead to any document the session can read, so what `browse`
// and the `jref*` functions return is a node of a document in one of the
// config's media types: a schema, JSON, or another, like JRef. A schema's
// node has the `type` `"json-schema"`. A session whose type doesn't say its
// config's media types, like a `Hyperjump<JsonSchemaConfig>`, could have
// any, so nothing is known about its nodes.

/**
 * `@hyperjump/browser`'s `browse`. In a session with the JSON Schema media
 * types, a fragment of a schema is an anchor or a JSON Pointer, and
 * documents are found in this order: an embedded resource, if
 * `referencedFrom` is a target in the document that contains it; a schema
 * in the config's registry; then it's retrieved. With
 * `reference: "manual"`, a schema that's a reference isn't followed, so
 * the target's document is the one at the URI.
 *
 * It throws a `SchemaError` if a schema has problems, with every problem
 * in the document, and an `Error` if more than one schema in the registries
 * is found by the URI.
 */
export { browse } from "@hyperjump/browser";

/**
 * Get a dialect. If it isn't one the JSON Schema media types were made with
 * or built in this session, its meta-schema is found with
 * {@link browse}, which can find it in a registry, and the dialect is
 * the one the meta-schema defines (see
 * `JsonSchemaDocumentNode.definedDialect`). That's `$vocabulary` in 2019-09
 * and 2020-12. The meta-schema must be a schema (`application/schema+json`
 * or a `.schema.json` file). A JSON document isn't used even if it has a
 * `$vocabulary`. A self-describing meta-schema's dialect has to be one the
 * media types were made with.
 *
 * @throws Error if the meta-schema can't be retrieved, isn't a schema,
 * doesn't define a dialect, or depends on a meta-schema that depends on
 * it.
 */
export const getDialect: (session: Hyperjump<JsonSchemaConfig>, uri: string, options?: GetDialectOptions) => Promise<Dialect>;

export type GetDialectOptions = {
  /**
   * The URI of the document that needs the dialect. When that document is a
   * meta-schema that's being retrieved to build a dialect, this is used to
   * detect meta-schemas that depend on each other, which would otherwise
   * wait for each other forever.
   */
  referencedFrom?: string;
};

// What follows is used by the library. It isn't exported from the package.

/** Whether a dialect is one the JSON Schema media types were made with or was built in this session */
export const hasDialect: (session: Hyperjump<JsonSchemaConfig>, uri: string) => boolean;
