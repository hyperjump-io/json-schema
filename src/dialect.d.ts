/**
 * The keywords that are available in a schema. A schema's dialect is
 * identified by its `$schema`, which is also the URI of the dialect's
 * meta-schema.
 *
 * Dialects that aren't added explicitly are built from the `$vocabulary` of
 * their meta-schema, which is retrieved the first time the dialect is used.
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

/** Keywords and formats to add to a dialect with `extendDialect` */
/**
 * A dialect without its URI, as a meta-schema defines it (see
 * `ResolveContext.defineDialect`). The dialect is identified by any URI the
 * meta-schema is found by.
 */
export type DialectDefinition = Omit<Dialect, "uri">;

export type DialectExtension = {
  /** Keyword names mapped to {@link Keyword} URIs */
  keywords?: Record<string, string>;

  /** Format names mapped to {@link Format} URIs */
  formats?: Record<string, string>;
};

export type UnknownKeywords = "error" | "annotation" | "ignore";
