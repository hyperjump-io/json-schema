import type { DocumentNode, GetOptions, Session } from "@hyperjump/browser";
import type { Json } from "@hyperjump/browser/json";
import type { Data } from "unist";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Dialect } from "./dialect.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchema } from "./json-schema.d.ts";
import type { SchemaError } from "./schema/schema-error.d.ts";

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
 * Retrieves and browses schemas. Everything resolved belongs to the session:
 * the documents it retrieves and the dialects it builds from meta-schemas.
 * Create one with {@link JsonSchema.session}, and pass it to operations, like
 * `validator` and `bundle`, so they share what it retrieved.
 */
export class JsonSchemaSession extends Session<JsonSchemaNode> {
  constructor(jsonSchema: JsonSchema, options?: SessionOptions);

  readonly jsonSchema: JsonSchema;

  /**
   * Documents are found in this order: an embedded resource, if the
   * reference is from the document that contains it (`referencedFrom`); a
   * schema in the session's registry, then in the {@link JsonSchema}'s
   * `registry`; then it's retrieved.
   *
   * @throws SchemaError if the schema has problems. It has every problem in
   * the document.
   * @throws RetrievalError from `@hyperjump/browser` if more than one schema
   * in the two registries is found by the URI.
   */
  getDocument(uri: string, options?: GetOptions): Promise<DocumentNode<JsonSchemaNode>>;

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
  getDialect(uri: string, options?: GetDialectOptions): Promise<Dialect>;

  /** Whether a dialect is in the {@link JsonSchema}'s config or was built in this session */
  hasDialect(uri: string): boolean;

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
  annotation<A extends Json = Json>(node: { data?: Data }, keyword: string, dialectUri?: string): A[];
}

export type GetDialectOptions = {
  /**
   * The URI of the document that needs the dialect. When that document is a
   * meta-schema that's being retrieved to build a dialect, this is used to
   * detect meta-schemas that depend on each other, which would otherwise
   * wait for each other forever.
   */
  referencedFrom?: string;
};
