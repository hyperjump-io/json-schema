/**
 * A named set of keywords, such as JSON Schema's Validation Vocabulary.
 * Keyword names can't start with `x-`. Those are reserved for schema authors
 * and must never assert.
 */
export type Vocabulary = {
  uri: string;

  /** Keyword names mapped to {@link Keyword} URIs */
  keywords: Record<string, string>;
};

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
   *   always allowed. They're guaranteed to never be defined by the dialect.
   * - `annotation`: Its value is collected as an annotation (2019-09,
   *   2020-12).
   * - `ignore`: It has no effect (draft-04 through draft-07).
   */
  unknownKeywords: UnknownKeywords;
};

export type UnknownKeywords = "error" | "annotation" | "ignore";
