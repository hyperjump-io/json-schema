# Dialects (`src/dialect.d.ts`)

- A dialect is `{ uri, keywords, unknownKeywords }`. `keywords` maps names to
  keyword URIs. In `jsonSchemaConfig`'s options, a dialect
  (`DialectConfig`) maps names to definitions or URIs, and the media
  types' definitions store it with URIs (see
  [Built-in dialects](../built-in-dialects/README.md)). The core has no vocabularies. A dialect is one flat map of
  keywords, and vocabularies are only how `$vocabulary` builds one. `unknownKeywords` is `"error"` (v1), `"annotation"` (2019-09,
  2020-12), or `"ignore"` (draft-04 through draft-07).
- There's no default dialect for every schema. A schema whose dialect
  can't be determined is an error. The dialect comes from `$schema`, then
  the containing resource, then a registry entry's or an operation's
  `dialectUri`, then the `schema`/`profile` media type parameter, then
  `defaultDialects`, by the document's URL (see
  [Default dialects](default-dialects.md)).
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
- The dialects are in `jsonSchemaConfig`'s options and can't change. A
  dialect in the options twice is an error. A keyword a dialect names by
  URI has to be defined, by another dialect or the options' `keywords`, or
  `jsonSchemaConfig` throws, because nothing can define it
  later. A format named by a URI nothing defines is only unsupported, like
  2020-12's `hostname` without the full formats. A dialect a meta-schema
  defines can still name a keyword that isn't defined, and that's reported when a
  schema uses it (`unsupported-keyword`).
- `extendDialect(dialect, { keywords, formats })` is a function that
  returns a dialect with more keywords and formats, which goes in the
  options instead. That's how users add custom keywords and formats to v1.
  It can't replace either. Rejected: methods that change a dialect, with
  `addDialect` and `removeDialect`, because a schema resolved before a
  change doesn't see it.

## The options

- The dialects, keywords, formats, and vocabularies are
  `jsonSchemaConfig`'s options, and can't change after the config is
  made, so nothing cached from a definition can go stale. Adding a
  dialect later, like one loaded with `import()` when a schema needs it,
  means making the media types again. Rejected: adding them with methods,
  because a schema resolved before a change doesn't see it.
  - The options are read once, into frozen tables, so changing a list
    afterward changes nothing. Rejected: keeping the caller's lists, so
    changing one would change what the config says without changing what
    it does.
- There's no default dialect. One isn't inferred when there's only
  one dialect, because adding a second would change how schemas without
  `$schema` are read. `defaultDialects` gives one to the documents at the
  URLs it names.
- A dialect in the config isn't plain data, because it holds definitions
  with functions. Nothing needed it to be: compiled schemas don't
  serialize dialects, and dialects from meta-schemas are built internally
  with URIs.

## Contents

- [Default dialects](default-dialects.md)
- [Vocabularies](vocabularies.md)
- [Dialects from meta-schemas](from-meta-schemas.md)
- [`x-` keywords](x-keywords.md)
- [Formats](../formats.md)
