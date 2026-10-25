# Dialects (`src/dialect.d.ts`)

- A dialect is `{ uri, keywords, unknownKeywords }`. `keywords` maps names to
  keyword URIs. The core has no vocabularies. A dialect is one flat map of
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
- Defined dialects can't be replaced. `removeDialect` must be called first.
- `extendDialect(uri, { keywords, formats })` adds keywords and formats to
  a defined dialect. That's how users add custom keywords and formats to v1.
  It can't replace either. Dialects are never changed in place.

## Contents

- [Vocabularies](vocabularies.md)
- [Dialects from meta-schemas](from-meta-schemas.md)
- [`x-` keywords](x-keywords.md)
- [Formats](../formats.md)
