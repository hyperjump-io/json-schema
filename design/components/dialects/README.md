# Dialects (`src/dialect.d.ts`)

- A dialect is `{ uri, keywords, unknownKeywords }`. `keywords` maps names to
  keyword URIs. In the config, a dialect (`DialectConfig`) maps names to
  definitions or URIs, and the `JsonSchema` stores it with URIs (see
  [Built-in dialects](../built-in-dialects/README.md)). The core has no vocabularies. A dialect is one flat map of
  keywords, and vocabularies are only how `$vocabulary` builds one. `unknownKeywords` is `"error"` (v1), `"annotation"` (2019-09,
  2020-12), or `"ignore"` (draft-04 through draft-07).
- There's no default dialect unless the user sets `defaultDialectUri` in the
  config. Otherwise, a schema whose dialect can't be determined is an error.
  The dialect comes from `$schema`, then the containing resource, then the
  `schema`/`profile` media type parameter, then the config.
- `$schema` is only allowed where a schema resource starts. Anywhere else,
  it's ignored with a message and the parent's dialect is used.
- A `$schema` is read the same way in every dialect, and it's tolerant: the
  URI is normalized and its fragment is dropped before the dialect is
  looked up, so `HTTP://json-schema.org/draft-07/schema` finds draft-07.
  It's lint that reports what's wrong with it (`non-canonical-dialect-uri`,
  `invalid-dialect-uri`), not the resolver. In draft-04 through 2020-12,
  `$schema` identifies both the dialect and the meta-schema. A fragment
  that isn't empty, like `#/$defs/strict`, is fine for the meta-schema,
  which resolves to that subschema, but not for the dialect, which is
  identified without it. The empty fragment is how draft-04 through
  draft-07 meta-schemas identify themselves, and 2019-09 and 2020-12's
  don't use one. Implementations that compare dialect URIs as strings only
  recognize those exact forms. v1 drops the meta-schema role
  (json-schema-org/json-schema-spec#1712): `$schema` only identifies the
  dialect, and it MUST be normalized and have no fragment.
- A `JsonSchema`'s dialects are in its config and can't change. A dialect
  in the config twice is an error. A keyword a dialect names by URI has to
  be defined, by another dialect or the config's `keywords`, or
  constructing the `JsonSchema` throws, because nothing can define it
  later. A format named by a URI nothing defines is only unsupported, like
  `hostname` without the full formats. A dialect a meta-schema defines can
  still name a keyword that isn't defined, and that's reported when a
  schema uses it (`unsupported-keyword`).
- `extendDialect(dialect, { keywords, formats })` is a function that
  returns a dialect with more keywords and formats, which goes in the
  config instead. That's how users add custom keywords and formats to v1.
  It can't replace either. Before 2026-10-29 it was a method that changed
  the instance's dialect, with `addDialect` and `removeDialect`, and a
  schema resolved before the change didn't see it.

## The config

- A `JsonSchema`'s dialects, keywords, formats, and vocabularies are in its
  config, and can't change after it's created. Before 2026-10-29 they were
  added with methods, and a schema resolved before a change didn't see it.
  Now nothing cached from a definition can go stale. Adding a dialect
  later, like one loaded with `import()` when a schema needs it, means
  creating another `JsonSchema`.
- There's still no default dialect. One isn't inferred when there's only
  one dialect, because adding a second would change how schemas without
  `$schema` are read. `defaultDialectUri` sets one.
- A dialect in the config isn't plain data, because it holds definitions
  with functions. Nothing needed it to be: compiled schemas don't
  serialize dialects, and dialects from meta-schemas are built internally
  with URIs.

## Contents

- [Vocabularies](vocabularies.md)
- [Dialects from meta-schemas](from-meta-schemas.md)
- [`x-` keywords](x-keywords.md)
- [Formats](../formats.md)
