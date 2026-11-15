import type { HyperjumpConfig, Json, MediaTypePlugin, ReadonlyJson } from "@hyperjump/browser";
import type { Keyword } from "./keyword.d.ts";
import type { Dialect, DialectConfig, DialectExtension, DialectKeywords, DialectSchema, UnknownKeywords, Vocabulary, VocabularyConfig } from "./dialect.d.ts";
import type { Format } from "./format.d.ts";
import type { SchemaRegistry } from "./registry/schema-registry.d.ts";
import type { schemaMediaType } from "./schema/media-type-plugin.d.ts";
import type { jsonOrSchemaMediaType } from "./schema/json-media-type-plugin.d.ts";

export { outputErrorMessage, toVFileMessage } from "./output/validation-error.js";
export { SchemaError } from "./schema/schema-error.js";
export type { ValidationError, DetailedValidationError } from "./output/validation-error.js";
export type { SchemaMessage } from "./schema/schema-error.js";
export type { BasicOutput, DetailedOutput, OutputError, OutputFormat, JsonSyntaxError } from "./output/output-format.d.ts";

/** The definitions schemas are read with, which `jsonSchemaConfig` takes */
export type JsonSchemaOptions<D extends DialectConfig<any, any, any> = DialectConfig<any, any, any>> = {
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
   * used. A dialect can't be in the list twice. Their schema types are the
   * config's.
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
 * What schemas are read with: a session's config, and what operations, like
 * `validate` and `bundle`, take. It's browser's config, with the JSON Schema
 * media types in its `mediaTypes` and a `registry`. `S` is the type of its
 * schemas, from the dialects the media types were made with.
 *
 * ```js
 * const config = jsonSchemaConfig({ dialects: [v1Dialect] });
 * ```
 *
 * Without a `stack`, each session has one of its own, so calls don't share
 * an HTTP cache. To share one, put a stack with one in the config, and make
 * the config once.
 */
export type JsonSchemaConfig<S = any> = HyperjumpConfig & {
  /**
   * The media types documents are read with, which have to include the
   * JSON Schema media types, which `jsonSchemaConfig` puts first.
   */
  readonly mediaTypes: readonly (SchemaMediaType<S> | MediaTypePlugin<any>)[];

  /**
   * Schemas every session sees, like custom meta-schemas. An operation sees
   * them with its own `registry`, as one registry, so a schema in either
   * can use a dialect a schema in the other defines. Give it the schema
   * type of the dialects, like `new SchemaRegistry<V1Schema>()`, so its
   * schemas are checked.
   */
  readonly registry?: SchemaRegistry<any>;
};

/**
 * A dialect with more keywords or formats, such as a custom keyword in the
 * v1 dialect. Pass it in the options instead of the dialect. Its schema type
 * has the keywords it adds.
 *
 * @throws Error if the dialect already has a keyword or format with one of
 * the names, or a keyword name starts with `x-`
 */
export function extendDialect<K extends DialectKeywords, Uri extends string, U extends UnknownKeywords, E extends DialectKeywords = {}>(
  dialect: DialectConfig<K, Uri, U>,
  extension: DialectExtension<E>
): DialectConfig<K & E, Uri, U>;

/** Any dialect in the options. It's `D` when there are none. */
export type AnyDialectConfig = DialectConfig<DialectKeywords, string, UnknownKeywords>;

/**
 * Any schema: what JSON Schema media types without dialects take, because
 * their schemas' dialects come from meta-schemas
 */
export type AnySchema = boolean | { readonly [property: string]: ReadonlyJson };

declare const schemaType: unique symbol;

/**
 * The JSON Schema media type (`application/schema+json`), with the
 * definitions it reads schemas with. `S` is the type of its schemas. It's
 * only a type: nothing has the `schemaType` property.
 */
export type SchemaMediaType<S = any> = typeof schemaMediaType & {
  readonly definitions: JsonSchemaDefinitions;
  readonly [schemaType]: S;
};

/** JSON that can be a schema (`application/json`) */
export type JsonOrSchemaMediaType = typeof jsonOrSchemaMediaType;

/**
 * The schema type of a config (`S`), like `V1Schema`, for a registry of its
 * schemas: `new SchemaRegistry<SchemaTypeOf<typeof config>>()`
 */
export type SchemaTypeOf<C> = C extends { readonly mediaTypes: readonly (infer P)[] }
  ? (P extends SchemaMediaType<infer S> ? S : never)
  : never;

/**
 * What `jsonSchemaConfig` takes: the definitions schemas are read with,
 * and browser's config options. `mediaTypes` are more media types, like
 * `jrefMediaType`, which come after the JSON Schema ones.
 */
export type JsonSchemaConfigOptions<D extends DialectConfig<any, any, any> = DialectConfig<any, any, any>, M extends MediaTypePlugin<any> = MediaTypePlugin<any>>
  = JsonSchemaOptions<D> & Omit<HyperjumpConfig, "mediaTypes"> & {
    /** Schemas every call and session sees, like custom meta-schemas */
    registry?: SchemaRegistry<any>;

    /**
     * Media types documents can be in, besides JSON Schema and JSON, like
     * `jrefMediaType` for JRef. They come after the JSON Schema media types,
     * so JSON is read by the plugin that finds schemas in it.
     */
    mediaTypes?: readonly M[];
  };

/**
 * Make a config: browser's config options, with the JSON Schema media types
 * made from the definition options, then the options' `mediaTypes`. It's a
 * plain value, so a config for another call or session is
 * `{ ...config, registry }`. Its schema type is the union of the dialects'
 * ({@link DialectSchema}), so a schema an operation is given as a value is
 * checked against it.
 *
 * ```js
 * const config = jsonSchemaConfig({ dialects: [v1Dialect] });
 * ```
 *
 * @throws Error if a dialect is in the options more than once, or a dialect
 * or vocabulary names a keyword that has no definition.
 */
// Without a default for D, which TypeScript would pick instead of inferring
// it when a dialect in the options has a function with untyped parameters
export function jsonSchemaConfig<const D extends AnyDialectConfig, M extends MediaTypePlugin<any> = never>(
  options?: JsonSchemaConfigOptions<D, M>
): Omit<JsonSchemaConfig<SchemaOfDialects<D>>, "mediaTypes"> & {
  readonly mediaTypes: readonly (SchemaMediaType<SchemaOfDialects<D>> | JsonOrSchemaMediaType | M)[];
};

/** The schema type of the dialects in the options. It's any schema without them. */
export type SchemaOfDialects<D extends AnyDialectConfig> = AnyDialectConfig extends D ? AnySchema : DialectSchema<D>;

/** The definitions schemas are read with, on the JSON Schema media type */
export type JsonSchemaDefinitions = {
  /**
   * The keyword definitions, by URI: the options', then the ones the
   * dialects and vocabularies bring
   */
  readonly keywords: Readonly<Record<string, Keyword>>;

  /** The format definitions, by URI, like `keywords` */
  readonly formats: Readonly<Record<string, Format>>;

  /**
   * The options' dialects, with their definitions named by URI. They're by
   * identifier: the URI without a fragment, normalized. A dialect a session
   * built from its meta-schema isn't here (see `getDialect`).
   */
  readonly dialects: Readonly<Record<string, Dialect>>;

  /**
   * The vocabularies `$vocabulary` can use, from the options or a dialect,
   * with their definitions named by URI. They're by identifier, like
   * `dialects`.
   */
  readonly vocabularies: Readonly<Record<string, Vocabulary>>;

  readonly defaultDialectUri: string | undefined;
  readonly validateFormats: boolean | undefined;
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
