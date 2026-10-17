/**
 * A named set of keywords, such as JSON Schema's Validation Vocabulary.
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
   * isn't included is an unknown keyword.
   */
  keywords: Record<string, string>;
};
