import type { DocumentNode, GetOptions, Session } from "@hyperjump/browser";
import type { Json } from "@hyperjump/browser/json";
import type { Data } from "unist";
import type { PluggableList } from "unified";
import type { SchemaMessage } from "./schema/schema-error.d.ts";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Dialect } from "./dialect.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchema, Validator } from "./json-schema.d.ts";
import type { SchemaError } from "./schema/schema-error.d.ts";

export type SessionOptions = {
  /**
   * Registries only this session sees, in addition to the
   * {@link JsonSchema}'s. They're checked first.
   */
  registries?: SchemaRegistry<any>[];

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

export type BundleOptions = {
  /**
   * Give every embedded schema `$schema`. By default, only one whose dialect
   * is different from the main schema's has it.
   */
  alwaysIncludeDialect?: boolean;

  /**
   * The name of an embedded schema in the definitions: its identifier
   * (`uri`, the default) or a random UUID (`uuid`).
   */
  definitionNamingStrategy?: DefinitionNamingStrategy;

  /**
   * Schemas that will be available where the bundle is used, so they aren't
   * embedded, and neither is anything only they reference.
   */
  externalSchemas?: string[];
};

export type DefinitionNamingStrategy = "uri" | "uuid";

export type LintOptions = {
  /**
   * The lint plugins, in the shape of `.hyperjumprc`'s: rules and presets,
   * each optionally with its config (`[recommended, [rule, ["error"]]]`).
   * The default is `lint/recommended`.
   */
  plugins?: PluggableList;
};

/**
 * Retrieves, browses, and compiles schemas. Everything resolved belongs to
 * the session: the documents it retrieves and the dialects it builds from
 * meta-schemas. Create one with {@link JsonSchema.session}.
 */
export class JsonSchemaSession extends Session<JsonSchemaNode> {
  constructor(jsonSchema: JsonSchema, options?: SessionOptions);

  readonly jsonSchema: JsonSchema;

  /**
   * Documents are found in this order: an embedded resource, if the
   * reference is from the document that contains it (`referencedFrom`); a
   * schema in a session registry, then in one of the {@link JsonSchema}'s
   * registries; then it's retrieved.
   *
   * @throws SchemaError if the schema has problems. It has every problem in
   * the document.
   * @throws RetrievalError from `@hyperjump/browser` if more than one schema
   * in the registries is found by the URI.
   */
  getDocument(uri: string, options?: GetOptions): Promise<DocumentNode<JsonSchemaNode>>;

  /**
   * Get a dialect. If it hasn't been added to the {@link JsonSchema} or
   * built in this session, its meta-schema is found with
   * {@link getDocument}, which can find it in a registry, and the dialect is
   * the one the meta-schema defines (see
   * `JsonSchemaDocumentNode.definedDialect`). That's `$vocabulary` in 2019-09
   * and 2020-12. The meta-schema must be a schema (`application/schema+json`
   * or a `.schema.json` file). A JSON document isn't used even if it has a
   * `$vocabulary`. A self-describing meta-schema's dialect has to be added.
   *
   * @throws Error if the meta-schema can't be retrieved, isn't a schema,
   * doesn't define a dialect, or depends on a meta-schema that depends on
   * it.
   */
  getDialect(uri: string, options?: GetDialectOptions): Promise<Dialect>;

  /** Whether a dialect has been added to the {@link JsonSchema} or built in this session */
  hasDialect(uri: string): boolean;

  /**
   * Compile a schema into a {@link Validator}. The validator doesn't need
   * the session after it's compiled.
   *
   * @throws SchemaError if a schema has problems. It has every problem in
   * the first document found to have any.
   * @throws RetrievalError from `@hyperjump/browser` if a schema can't be
   * retrieved.
   */
  compile(uri: string): Promise<Validator>;

  /**
   * Bundle a schema and every schema it references into one compound schema
   * document, the way the 2020-12 specification describes, in any dialect.
   * Each referenced document is embedded in the main schema's definitions
   * (`$defs`, or `definitions` in draft-04 through draft-07) with its
   * identifier, so references find it without being changed, and the bundle
   * gives the same output as the schemas it was made from.
   *
   * The whole document `uri` is in is bundled. References are `$ref` and
   * 2020-12's `$dynamicRef`, including ones in definitions nothing uses.
   * Meta-schemas aren't bundled.
   *
   * The main schema always has `$schema`. It's identified by its URI, unless
   * it's a file. Then the bundle can be moved with the files it came from,
   * so it isn't given an identifier, and embedded files get identifiers
   * relative to it.
   *
   * @throws Error if a schema can't be embedded: a reference finds a schema
   * that's identified by a different URI, the root of a referenced schema is
   * a `$ref` that replaces the whole object (draft-04 through draft-07),
   * which would ignore its identifier, or the main schema's dialect has
   * nowhere to put it.
   * @throws SchemaError if a schema has problems.
   * @throws RetrievalError from `@hyperjump/browser` if a schema can't be
   * found.
   */
  bundle(uri: string, options?: BundleOptions): Promise<Json>;

  /**
   * Lint the whole document `uri` is in: every schema in it, including
   * definitions nothing references, as a file is linted in a unified
   * pipeline. The documents it references aren't linted, but rules can look
   * at them, through this session.
   *
   * It returns each message as plain data, with its `severity`: `"error"`
   * if the rule is configured as an error, and `"warn"` otherwise. A
   * document with schema problems can't be linted, so its problems are
   * returned instead of thrown.
   *
   * @throws Error if `uri` isn't a schema.
   * @throws RetrievalError from `@hyperjump/browser` if the document can't
   * be retrieved.
   */
  lint(uri: string, options?: LintOptions): Promise<SchemaMessage[]>;

  /**
   * The values a keyword annotated a node with, one for every schema
   * location where it applied, from `annotate`, `annotateJson`, or
   * `annotateNode`. The node can be a property name, which `propertyNames`
   * annotates. A node the keyword didn't annotate has none.
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
