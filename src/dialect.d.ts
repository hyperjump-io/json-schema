import type { Keyword, KeywordValue, Shape } from "./keyword.d.ts";
import type { Format } from "./format.d.ts";

/**
 * A dialect as it's given to a {@link JsonSchema} in its config, with the
 * definitions it uses. A keyword or format can be a definition or a URI. A
 * URI means the definition comes from somewhere else: the config's
 * `keywords` or `formats`, or another dialect. A format named by a URI that
 * nothing defines isn't supported, like `hostname` without the full formats.
 * The `JsonSchema` keeps it as a {@link Dialect}, with URIs.
 *
 * Its type parameters are its keywords, URI, and what unknown keywords
 * mean, so its schema type ({@link DialectSchema}) comes from its
 * definitions. A keyword named by a URI has no type, so any value is
 * allowed for it.
 */
export type DialectConfig<
  K extends DialectKeywords = DialectKeywords,
  Uri extends string = string,
  U extends UnknownKeywords = UnknownKeywords
> = {
  uri: Uri;

  /**
   * Keyword names mapped to their definitions. See {@link Dialect.keywords}.
   */
  keywords: K;

  /** See {@link Dialect.unknownKeywords} */
  unknownKeywords: U;

  /** Format names mapped to their definitions. See {@link Dialect.formats}. */
  formats?: Record<string, Format | string>;

  /** See {@link Dialect.assertFormats} */
  assertFormats?: boolean;

  /**
   * The vocabularies `$vocabulary` can use, by URI, for a dialect whose
   * meta-schemas list them, like 2020-12. Every dialect of a `JsonSchema`
   * sees them.
   */
  vocabularies?: Record<string, VocabularyConfig>;
};

/** Keyword names mapped to definitions or their URIs */
export type DialectKeywords = Record<string, Keyword<any, Shape, any> | string>;

/**
 * The type of a schema in a dialect from the config, for checking schemas
 * written in TypeScript. A union of dialects gives a union of their schema
 * types.
 *
 * ```ts
 * type MySchema = DialectSchema<typeof myDialect>;
 * ```
 */
export type DialectSchema<D> = D extends DialectConfig<infer K, infer Uri, infer U>
  ? SchemaOf<{ [Name in keyof K]: K[Name] extends Keyword<any, any, any> ? K[Name] : Keyword<any, any, any> }, Uri, U>
  : never;

/**
 * What a vocabulary adds to a dialect a meta-schema defines with
 * `$vocabulary`. `assertFormats` makes `format` validate by default if any
 * listed vocabulary says so (2020-12's format-assertion).
 */
export type VocabularyConfig = {
  keywords: Record<string, Keyword<any, any, any> | string>;
  formats?: Record<string, Format | string>;
  assertFormats?: boolean;
};

/** A vocabulary as a {@link JsonSchema} keeps it, with URIs */
export type Vocabulary = {
  keywords: Readonly<Record<string, string>>;
  formats?: Readonly<Record<string, string>>;
  assertFormats?: boolean;
};

/**
 * The keywords that are available in a schema. A schema's dialect is
 * identified by its `$schema`, which is also the URI of the dialect's
 * meta-schema.
 *
 * Dialects that aren't in the {@link JsonSchema}'s config are built from
 * the `$vocabulary` of their meta-schema, which is retrieved the first time
 * the dialect is used. This is how a dialect is read, with its definitions
 * named by URI. It's given as a {@link DialectConfig}.
 */
export type Dialect = {
  uri: string;

  /**
   * Keyword names mapped to {@link Keyword} URIs. `$schema` is part of every
   * dialect, so it doesn't need to be included. A property of a schema that
   * isn't included is an unknown keyword. Keyword names can't start with
   * `x-`. Those are reserved for schema authors and must never assert.
   */
  keywords: Record<string, string>;

  /**
   * What an unknown keyword means. In every case, the schema AST records it
   * as an unknown keyword.
   *
   * - `error`: The schema is invalid (v1). Keywords starting with `x-` are
   *   always allowed, and they're annotations. They're guaranteed to never be
   *   defined by the dialect.
   * - `annotation`: Its value is collected as an annotation (2019-09,
   *   2020-12).
   * - `ignore`: It has no effect (draft-04 through draft-07).
   */
  unknownKeywords: UnknownKeywords;

  /**
   * Format names mapped to {@link Format} URIs. A format that isn't included
   * isn't supported. That's an error if formats are validated. Otherwise,
   * `format` is only an annotation, so any name is allowed.
   */
  formats?: Record<string, string>;

  /**
   * Whether `format` validates by default. The `validateFormats` config
   * overrides it. It's `true` in v1 and `false` in most other dialects.
   */
  assertFormats?: boolean;
};

/**
 * A dialect without its URI, as a meta-schema defines it (see
 * `ResolveContext.defineDialect`). The dialect is identified by any URI the
 * meta-schema is found by.
 */
export type DialectDefinition = Omit<Dialect, "uri">;

/** Keywords and formats to add to a dialect with `extendDialect` */
export type DialectExtension<E extends DialectKeywords = DialectKeywords> = {
  /** Keyword names mapped to definitions or their URIs */
  keywords?: E;

  /** Format names mapped to definitions or their URIs */
  formats?: Record<string, Format | string>;
};

export type UnknownKeywords = "error" | "annotation" | "ignore";

/**
 * The type of a schema in a dialect, for checking schemas written in
 * TypeScript. `K` maps the dialect's keyword names to their definitions'
 * types, `Uri` is the dialect's URI, and `U` is what an unknown keyword
 * means. If it's an error, only keywords starting with `x-` are allowed.
 * Otherwise, any keyword is, but the values of the dialect's keywords are
 * still checked. `$schema` can have an empty fragment, as draft-04 through
 * draft-07 schemas usually do. The
 * type of each keyword's value is its {@link KeywordValue}. The built-in dialects
 * export their schema types, such as `V1Schema`.
 *
 * ```ts
 * type MySchema = SchemaOf<V1Keywords & { myKeyword: typeof myKeyword }, typeof v1DialectUri, "error">;
 * ```
 *
 * The type is the same everywhere in the schema, so an embedded schema
 * resource with a different `$schema` doesn't fit it. What a keyword's
 * {@link Keyword.check} reports, like a negative `minLength`, isn't part of
 * the type.
 */
export type SchemaOf<K extends Record<string, Keyword<any, any, any>>, Uri extends string, U extends UnknownKeywords> = boolean | (
  { $schema?: Uri | `${Uri}#` }
  & { [Name in keyof K]?: KeywordValue<K[Name], SchemaOf<K, Uri, U>> }
  & (U extends "error" ? { [name: `x-${string}`]: unknown } : { [name: string]: unknown })
);
