import type { Hyperjump, Json } from "@hyperjump/browser";
import type { Data } from "unist";
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
// browsing, `annotation`, and unified pipelines (`jsonSchemaResolve`).
// Operations, like `validator` and `bundle`, start a session of their own.
//
// A config's `registry` is a `SchemaRegistry`, which the session asks before
// anything is retrieved, so `allowRetrieval` doesn't apply to a registry's
// schema.
//
// A reference can lead to any document the session can read, so what `get`
// and the `jref*` functions return is a node of a document in one of the
// config's media types: a schema, JSON, or another, like JRef. A schema's
// node has the `type` `"json-schema"`. A session whose type doesn't say its
// config's media types, like a `Hyperjump<JsonSchemaConfig>`, could have
// any, so nothing is known about its nodes.

/**
 * `@hyperjump/browser`'s `get` and `getDocument`. In a session with the JSON
 * Schema media types, a fragment of a schema is an anchor or a JSON
 * Pointer, and documents are found in this order: an embedded resource, if
 * `referencedFrom` is a node of the document that contains it; a schema in
 * the config's registry; then it's retrieved. `getDocument` never finds an embedded resource.
 *
 * They throw a `SchemaError` if a schema has problems, with every problem
 * in the document, and an `Error` if more than one schema in the registries
 * is found by the URI.
 */
export { get, getDocument } from "@hyperjump/browser";

/**
 * Get a dialect. If it isn't one the JSON Schema media types were made with
 * or built in this session, its meta-schema is found with
 * {@link getDocument}, which can find it in a registry, and the dialect is
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

/**
 * The values a keyword annotated a node with, one for every schema
 * location where it applied, from `annotate` or `annotator`. The node can
 * be a property name, which `propertyNames` annotates. A node the keyword
 * didn't annotate has none.
 *
 * The keyword is a keyword URI, if a keyword with that URI has been added,
 * or a name in the dialect, which is v1 by default. A name that isn't a
 * keyword in the dialect is an unknown keyword. An unknown keyword's URI
 * is `https://json-schema.org/keyword/unknown#` followed by its name.
 *
 * The AST is a unist tree, so unist utilities such as `unist-util-visit`
 * can find the nodes that have an annotation.
 *
 * The node doesn't have to be from a schema compiled in this session, but
 * a dialect built from a meta-schema has to have been built in this one.
 *
 * @throws Error if a name is given and the dialect isn't defined in this
 * session.
 */
export const annotation: <A extends Json = Json>(session: Hyperjump<JsonSchemaConfig>, node: { data?: Data }, keyword: string, dialectUri?: string) => A[];

// What follows is used by the library. It isn't exported from the package.

/** Whether a dialect is one the JSON Schema media types were made with or was built in this session */
export const hasDialect: (session: Hyperjump<JsonSchemaConfig>, uri: string) => boolean;
