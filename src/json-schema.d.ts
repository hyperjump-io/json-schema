import type { Hyperjump, HyperjumpConfig, Json, ReadonlyJson } from "@hyperjump/browser";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, DialectConfig, DialectExtension, DialectKeywords, DialectSchema, UnknownKeywords, Vocabulary, VocabularyConfig } from "./dialect.d.ts";
import type { Format } from "./format.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { JsonSchemaSession, SessionOptions } from "./session.d.ts";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export { RetrievalNotAllowedError } from "@hyperjump/browser";
export type { ValidationError, DetailedValidationError } from "./output/validation-error.js";
export type { SchemaMessage } from "./schema/schema-error.js";
export type { BasicOutput, DetailedOutput, OutputError, OutputFormat, JsonSyntaxError } from "./output/output-format.d.ts";

export type JsonSchemaConfig<D extends DialectConfig<any, any, any> = DialectConfig<any, any, any>> = HyperjumpConfig<JsonSchemaNode> & {
  /**
   * The dialect of a schema that doesn't have `$schema` and doesn't get a
   * dialect from anywhere else, such as a `Content-Type` parameter or the
   * resource it's embedded in. There is no default. Without one, such a
   * schema is an error.
   */
  defaultDialectUri?: string;

  /**
   * Validate `format`. Defaults to whatever the dialect says. `format` is an
   * annotation in most dialects.
   */
  validateFormats?: boolean;

  /**
   * The dialects schemas can use, like `v1Dialect`, with the keywords and
   * formats they bring. Other dialects can still be defined by meta-schemas
   * (`$vocabulary`), and a session builds those the first time they're
   * used. A dialect can't be in the list twice. They can't change after the
   * `JsonSchema` is created. Their schema types are the `JsonSchema`'s.
   */
  dialects?: D[];

  /**
   * Keywords that replace a dialect's definition with the same URI, or that
   * a dialect names by URI
   */
  keywords?: Keyword<any, any, any>[];

  /**
   * Formats that replace a dialect's definition with the same URI, or that
   * a dialect names by URI, like `fullFormats`
   */
  formats?: Format[];

  /**
   * More vocabularies `$vocabulary` can use, by URI, in addition to the ones
   * the dialects bring. One here replaces a dialect's.
   */
  vocabularies?: Record<string, VocabularyConfig>;
};

/**
 * A dialect with more keywords or formats, such as a custom keyword in the
 * v1 dialect. Pass it in the config instead of the dialect. Its schema type
 * has the keywords it adds.
 *
 * @throws Error if the dialect already has a keyword or format with one of
 * the names, or a keyword name starts with `x-`
 */
export function extendDialect<K extends DialectKeywords, Uri extends string, U extends UnknownKeywords, E extends DialectKeywords = {}>(
  dialect: DialectConfig<K, Uri, U>,
  extension: DialectExtension<E>
): DialectConfig<K & E, Uri, U>;

/** Any dialect in the config. It's `D` when there are none. */
type AnyDialectConfig = DialectConfig<DialectKeywords, string, UnknownKeywords>;

/**
 * Any schema: what a `JsonSchema` without dialects in its config takes,
 * because its schemas' dialects come from meta-schemas
 */
export type AnySchema = boolean | { readonly [property: string]: ReadonlyJson };

/**
 * The schema type of a `JsonSchema` (`S`), like `V1Schema`, for a registry
 * of its schemas: `new SchemaRegistry<SchemaTypeOf<typeof jsonSchema>>()`
 */
export type SchemaTypeOf<J> = J extends JsonSchema<infer S> ? S : never;

/**
 * Creates a `JsonSchema`. Its schema type is the union of its dialects'
 * ({@link DialectSchema}), so `new JsonSchema({ dialects: [v1Dialect] })` is
 * a `JsonSchema<V1Schema>`, and a schema an operation is given as a value
 * is checked against it.
 */
export type JsonSchemaConstructor = {
  // Without a default for D, which TypeScript would pick instead of
  // inferring it when a dialect in the config has a function with untyped
  // parameters
  new<const D extends AnyDialectConfig>(config?: JsonSchemaConfig<D>): JsonSchema<AnyDialectConfig extends D ? AnySchema : DialectSchema<D>>;

  // For `class MyJsonSchema extends JsonSchema`, which needs a signature
  // without type parameters. A subclass's schemas are `any`.
  new (config?: JsonSchemaConfig): JsonSchema;
  readonly prototype: JsonSchema;
};

export const JsonSchema: JsonSchemaConstructor;

/**
 * What decides how schemas are read: definitions, a registry, and how
 * schemas are retrieved. `S` is the type of its schemas, from its dialects.
 * Operations, like `validate` and `bundle`, are functions that take it.
 */
export interface JsonSchema<S = any> extends Hyperjump<JsonSchemaNode> {
  readonly config: JsonSchemaConfig;

  /**
   * Start a session for retrieving and browsing schemas. Dialects built
   * from meta-schemas belong to the session, like the documents it
   * retrieves. Operations given the session share them.
   */
  session(options?: SessionOptions): JsonSchemaSession<S>;

  /**
   * Schemas every session sees, like custom meta-schemas, after the
   * session's own `registry`. It starts empty. Change it by replacing it
   * with a new registry (`with`, `without`, `concat`). A session sees the
   * registry this was when the session was created.
   *
   * It has the `JsonSchema`'s schema type, so a schema added to it with
   * `jsonSchema.registry = jsonSchema.registry.with(schema)` is checked.
   * Any registry can be assigned to it.
   */
  get registry(): SchemaRegistry<S>;
  set registry(value: SchemaRegistry<any>);

  /** Whether there's a keyword definition with this URI */
  hasKeyword(uri: string): boolean;

  /**
   * Get a keyword definition.
   *
   * @throws Error if the keyword isn't in the config or a dialect.
   */
  getKeyword(uri: string): Keyword;

  /** Whether there's a format definition with this URI */
  hasFormat(uri: string): boolean;

  /**
   * Get a format definition.
   *
   * @throws Error if the format isn't in the config or a dialect.
   */
  getFormat(uri: string): Format;

  /**
   * Whether a dialect is in the config. A dialect a session built from its
   * meta-schema isn't.
   */
  hasDialect(uri: string): boolean;

  /**
   * Get a dialect from the config, with its definitions named by URI.
   *
   * @throws Error if the dialect isn't in the config.
   */
  getDialect(uri: string): Dialect;

  /**
   * A vocabulary `$vocabulary` can use, from the config or a dialect, with
   * its definitions named by URI
   */
  getVocabulary(uri: string): Vocabulary | undefined;
}

declare module "unist" {
  interface Data {
    /**
     * Annotations collected for this instance location, by annotation keyword
     * URI. Each keyword has a value for every schema location where it applied
     * successfully.
     */
    annotations?: Map<string, Json[]>;
  }
}
