import type { DocumentSession, Hyperjump, jrefMediaType, Json, MediaTypePlugin } from "@hyperjump/browser";
import type { Data } from "unist";
import type { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Dialect } from "./dialect.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchema, JsonSchemaConfig } from "./json-schema.d.ts";
import type { schemaMediaType } from "./schema/media-type-plugin.d.ts";
import type { jsonOrSchemaMediaType } from "./schema/json-media-type-plugin.d.ts";
import type { SessionRegistries } from "./registry/session-registries.js";

export type SessionOptions = {
  /**
   * Schemas only this session sees, in addition to the {@link JsonSchema}'s
   * `registry`. A schema in it can use a dialect defined by a meta-schema
   * in either. Combine registries with `concat`.
   */
  registry?: SchemaRegistry<any>;

  /**
   * What this session can retrieve, instead of the {@link JsonSchema}'s
   * `allowRetrieval` config. It's for an application that allows different
   * things for different sessions, such as the files in different folders
   * of a project. It replaces the config rather than adding to it, so a
   * session can allow less. To allow what the config allows too, include
   * its entries.
   */
  allowRetrieval?: string[];
};

/**
 * The media types every session reads documents with: JSON Schema, JSON
 * that can be a schema, and JRef
 */
export type SchemaMediaTypes = typeof schemaMediaType | typeof jsonOrSchemaMediaType | typeof jrefMediaType;

/**
 * Retrieves and browses schemas. Everything resolved belongs to the session:
 * the documents it retrieves and the dialects it builds from meta-schemas.
 * Create one with {@link JsonSchema.session}, and pass it to operations, like
 * `validator` and `bundle`, so they share what it retrieved.
 *
 * It's a session for `@hyperjump/browser`'s functions, like `get` and
 * `jrefStep`. Its `fetch` finds a schema in the session's registry, then in
 * the {@link JsonSchema}'s `registry`, before anything is retrieved, so
 * `allowRetrieval` doesn't apply to a registry's schema.
 *
 * A reference can lead to any document the session can read, so what `get`
 * and the `jref*` functions return is a node of a schema, of a JRef
 * document, of a JSON document, or of a document in one of the config's
 * media types (`M`). A schema's node has the `type` `"json-schema"`. A
 * session whose type doesn't say its `JsonSchema`'s media types, like a
 * `JsonSchemaSession` without type arguments, could have any, so nothing
 * is known about its nodes.
 */
export type JsonSchemaSession<S = any, M extends MediaTypePlugin<any> = MediaTypePlugin> = Omit<DocumentSession, "config"> & {
  /** The {@link JsonSchema}'s config, with the media types documents are read with */
  readonly config: Readonly<JsonSchemaConfig> & { readonly mediaTypes: readonly (SchemaMediaTypes | M)[] };

  /**
   * What the session retrieves with. Watching its requests, tracing them,
   * and closing it are the `Hyperjump`'s.
   */
  readonly hyperjump: Hyperjump;

  readonly jsonSchema: JsonSchema<S, M>;
};

/**
 * `@hyperjump/browser`'s `get` and `getDocument`. With a session of a
 * {@link JsonSchema}, a fragment of a schema is an anchor or a JSON Pointer,
 * and documents are found in this order: an embedded resource, if
 * `referencedFrom` is a node of the document that contains it; a schema in
 * the session's registry, then in the `JsonSchema`'s `registry`; then it's
 * retrieved. `getDocument` never finds an embedded resource.
 *
 * They throw a `SchemaError` if a schema has problems, with every problem
 * in the document, and an `Error` if more than one schema in the two
 * registries is found by the URI.
 */
export { get, getDocument } from "@hyperjump/browser";

/**
 * Get a dialect. If it isn't in the {@link JsonSchema}'s config or
 * built in this session, its meta-schema is found with
 * {@link getDocument}, which can find it in a registry, and the dialect is
 * the one the meta-schema defines (see
 * `JsonSchemaDocumentNode.definedDialect`). That's `$vocabulary` in 2019-09
 * and 2020-12. The meta-schema must be a schema (`application/schema+json`
 * or a `.schema.json` file). A JSON document isn't used even if it has a
 * `$vocabulary`. A self-describing meta-schema's dialect has to be in the
 * config.
 *
 * @throws Error if the meta-schema can't be retrieved, isn't a schema,
 * doesn't define a dialect, or depends on a meta-schema that depends on
 * it.
 */
export const getDialect: (session: JsonSchemaSession, uri: string, options?: GetDialectOptions) => Promise<Dialect>;

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
export const annotation: <A extends Json = Json>(session: JsonSchemaSession, node: { data?: Data }, keyword: string, dialectUri?: string) => A[];

// What follows is used by the library. It isn't exported from the package.

/** Start a session. It's what {@link JsonSchema.session} does. */
export const createSession: <S, M extends MediaTypePlugin<any>>(jsonSchema: JsonSchema<S, M>, options?: SessionOptions) => JsonSchemaSession<S, M>;

/**
 * Whether something is a session of a {@link JsonSchema}, and not a
 * `JsonSchema` or a session of `@hyperjump/browser`'s
 */
export const isSession: (context: object) => context is JsonSchemaSession;

/** The schemas a session finds in the registries it sees */
export const registriesOf: (session: JsonSchemaSession) => SessionRegistries;

/**
 * Add a schema document's resources to the ones the session has. The schema
 * media type plugins do this for every schema document they parse.
 */
export const addResources: (session: JsonSchemaSession, document: JsonSchemaDocumentNode) => void;

/**
 * The resource a node is in, for what a resource has beyond its values,
 * like its dynamic anchors. It's found by the node, since more than one
 * document can have a resource with its URI. It's `undefined` for a node
 * that isn't in a schema document the session has.
 */
export const resourceOf: (session: JsonSchemaSession, node: { location: string }) => JsonSchemaDocumentNode | undefined;

/** Whether a dialect is in the {@link JsonSchema}'s config or was built in this session */
export const hasDialect: (session: JsonSchemaSession, uri: string) => boolean;

/** The document a resource is in, which is the resource for a document's root */
export const documentOf: (session: JsonSchemaSession, resource: JsonSchemaDocumentNode) => JsonSchemaDocumentNode | undefined;
