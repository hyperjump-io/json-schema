import type { Fetcher, HyperjumpConfig, Json, MediaTypePlugin, ReadonlyJson } from "@hyperjump/browser";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, DialectConfig, DialectExtension, DialectKeywords, DialectSchema, UnknownKeywords, Vocabulary, VocabularyConfig } from "./dialect.d.ts";
import type { Format } from "./format.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { SchemaMediaTypes } from "./session.d.ts";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export type { ValidationError, DetailedValidationError } from "./output/validation-error.js";
export type { SchemaMessage } from "./schema/schema-error.js";
export type { BasicOutput, DetailedOutput, OutputError, OutputFormat, JsonSyntaxError } from "./output/output-format.d.ts";

export type JsonSchemaConfig<D extends DialectConfig<any, any, any> = DialectConfig<any, any, any>> = HyperjumpConfig & {
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

  /**
   * Schemas every session sees, like custom meta-schemas. A session sees
   * them with its own `registry`, as one registry, so a schema in either
   * can use a dialect a schema in the other defines. Give it the schema
   * type of the dialects, like `new SchemaRegistry<V1Schema>()`, so its
   * schemas are checked.
   */
  registry?: SchemaRegistry<any>;
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
 * Create a `JsonSchema`. Its schema type is the union of its dialects'
 * ({@link DialectSchema}), so `configureJsonSchema({ dialects: [v1Dialect] })`
 * is a `JsonSchema<V1Schema>`, and a schema an operation is given as a
 * value is checked against it. `M` is the config's media types, which a
 * session's documents can be in.
 *
 * @throws Error if a dialect is in the config more than once, or a dialect
 * or vocabulary names a keyword that has no definition.
 */
// Without a default for D, which TypeScript would pick instead of inferring
// it when a dialect in the config has a function with untyped parameters
export function configureJsonSchema<const D extends AnyDialectConfig, M extends MediaTypePlugin<any> = never>(
  config?: JsonSchemaConfig<D> & { mediaTypes?: readonly M[] }
): JsonSchema<AnyDialectConfig extends D ? AnySchema : DialectSchema<D>, M>;

/**
 * What decides how schemas are read: definitions, a registry, and how
 * schemas are retrieved. `S` is the type of its schemas, from its dialects.
 * It's a frozen value. Sessions (`JsonSchemaHyperjump`) and operations, like `validate`
 * and `bundle`, are functions that take it.
 */
export type JsonSchema<S = any, M extends MediaTypePlugin<any> = MediaTypePlugin> = {
  /**
   * The config it was created with. It's a frozen copy, with frozen copies
   * of its lists, so changing the object it was created with doesn't
   * change it. Its `mediaTypes` are the ones schemas are read with (JSON
   * Schema, JSON that can be a schema, and JRef), then the config's. The
   * first plugin that matches a response as well as another one parses it,
   * so the config's can't replace those.
   */
  readonly config: Readonly<JsonSchemaConfig> & { readonly mediaTypes: readonly (SchemaMediaTypes | M)[] };

  /**
   * What every session retrieves through: the config's `stack`, or one with
   * an HTTP cache in Node.js, so a session doesn't retrieve again what an
   * earlier one did. In a browser, which caches responses itself, it's
   * `@hyperjump/browser`'s default.
   */
  readonly stack: Fetcher;

  /**
   * The keyword definitions, by URI: the config's, then the ones the
   * dialects and vocabularies bring
   */
  readonly keywords: Readonly<Record<string, Keyword>>;

  /** The format definitions, by URI, like `keywords` */
  readonly formats: Readonly<Record<string, Format>>;

  /**
   * The config's dialects, with their definitions named by URI. They're by
   * identifier: the URI without a fragment, normalized. A dialect a session
   * built from its meta-schema isn't here (see `getDialect`).
   */
  readonly dialects: Readonly<Record<string, Dialect>>;

  /**
   * The vocabularies `$vocabulary` can use, from the config or a dialect,
   * with their definitions named by URI. They're by identifier, like
   * `dialects`.
   */
  readonly vocabularies: Readonly<Record<string, Vocabulary>>;
};

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
