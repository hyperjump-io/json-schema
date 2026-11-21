# OpenAPI 3.0, 3.1, and 3.2

`src/dialects/openapi-3-0` (`openApi30Dialect`) is the dialect of Schema
Objects in OpenAPI 3.0. `src/dialects/openapi-3-1` and
`src/dialects/openapi-3-2` (`openApi31Vocabulary`, `openApi32Vocabulary`)
are OpenAPI's vocabularies, because 3.1's and 3.2's dialects are defined by
their meta-schemas. Finding the schemas in an OpenAPI document is a
separate piece of work (see [Not done](#not-done)).

## Dialects from meta-schemas

- OpenAPI 3.1 and 3.2 define their dialects with meta-schemas, like
  `https://spec.openapis.org/oas/3.1/dialect/base` and
  `https://spec.openapis.org/oas/3.2/dialect/2026-02-26`. Their `$schema`
  is 2020-12, and their `$vocabulary` lists 2020-12's vocabularies and
  OpenAPI's (`https://spec.openapis.org/oas/3.1/vocab/base`,
  `…/3.2/vocab/base`). With the 2020-12 dialect in `dialects` and OpenAPI's
  vocabulary in `vocabularies`, the meta-schema defines the dialect (see
  [Dialects from meta-schemas](../dialects/from-meta-schemas.md)). So
  there's nothing to define but the vocabulary.
- Every published URI is a dialect, as OpenAPI says, including the dated
  ones and `jsonSchemaDialect`'s default, and a new date needs nothing
  here. Each module exports the type of its schemas, with the published
  URIs as `$schema`.
- What it costs:
  - The meta-schema has to be in a registry. spec.openapis.org serves
    its meta-schemas as `application/octet-stream`, which no media type
    plugin reads, so retrieving one fails whatever `allowRetrieval` says.
    A registry entry in the dialect isn't found by its `$id` until the
    registry has the meta-schema either, which the registry's error says,
    because a registry identifies its entries without retrieving anything.
  - `annotation` reads OpenAPI's keywords by keyword URI, not by name,
    because the dialect isn't one the media types were made with.
  - The meta-schemas list OpenAPI's vocabulary as optional (`false`), so
    without it in `vocabularies`, its keywords are unknown keywords, which
    are annotations, and their values aren't checked. Nothing reports that
    it's missing, which 3.1 allows.
- Users bring the meta-schemas they use. Rejected: shipping the
  published dialect meta-schemas as data for users to put in a registry,
  which is a file to add with every date OpenAPI publishes. Like the
  official JSON Schema meta-schemas, they aren't included (see
  [Built-in dialects](README.md#meta-schemas)).
- Rejected: a config dialect for each version, with a URI of its own. It
  wrote out 2020-12's keyword list again, needed a made-up URI for 3.2,
  which publishes only dated URIs, and made the dated URIs only
  meta-schemas, unlike OpenAPI. Rejected: a dialect for each published URI,
  which is another export with every new date.

## 3.0

- OpenAPI publishes no dialect or meta-schema for 3.0, only its document
  schema, and 3.0 is based on draft-04, which has no `$vocabulary`. So 3.0
  is a dialect in the config. Its URI is v1's,
  `https://spec.openapis.org/oas/3.0/dialect`. 3.0 Schema Objects don't
  have `$schema`, so it's mostly a default dialect's URI.

- A subset of draft-04, with `nullable`, `discriminator`, `example`,
  `externalDocs`, and `xml`. It has no `id`, `definitions`,
  `patternProperties`, `dependencies`, `additionalItems`, or `const`, and
  `items` is one schema (`keywords/items.js`). Unknown keywords are errors,
  except `x-` keywords, which are annotations. That's
  `unknownKeywords: "error"`, which v1 has too, and matches 3.0's "strictly
  unsupported" keywords and its Specification Extensions.
- `type` (`oas/3.0/type`) is one type, without `null`. It reads the sibling
  `nullable`, and `true` adds `null`. `nullable` has no keyword group,
  because it means nothing without `type`, as 3.0.3 says. It doesn't change
  other keywords, so `enum` without `null` still fails `null`.
- `type: "array"` without `items` is valid, and every item is, as in
  JSON Schema. 3.0 says `items` MUST be present, but the schema is
  understood without it, so it's the `array-without-items` lint rule, at
  `error` in the `openapi-3-0` preset (see
  [Be tolerant of bad input](../../principles/tolerant-input.md)).
  Rejected: `type`'s check, with `items` as a sibling, which refused a
  schema that's unambiguous.
- `readOnly` and `writeOnly` both `true` is valid. 3.0 says MUST NOT, so
  `read-only-and-write-only` is an error in `openapi-3-0` and a warning in
  `recommended`, where JSON Schema allows it. 3.1 and 3.2 follow JSON
  Schema. See [Rules](../lint/rules.md) for the presets.
- `$ref` is draft-07's, which makes the schema a reference and ignores its
  siblings, as 3.0's Reference Object does.
- `format` is draft-07's and an annotation by default, which is what most
  OpenAPI tools do. The formats are draft-04's, plus `date`,
  `int32`, and `password`.

## 3.1 and 3.2

- 2020-12 with OpenAPI's vocabulary: `discriminator`, `example`,
  `externalDocs`, and `xml`, and the `int32` and `password` formats. Unknown keywords
  are annotations.
- 3.2's `discriminator` has `defaultMapping`. Its `xml` has `nodeType`,
  which `attribute` and `wrapped` can't be used with, and its `namespace` is
  an IRI instead of a URI.

## The keywords

- Each one is an annotation of its value, as v1's were. None changes what's
  valid. Their URIs are under `https://spec.openapis.org/oas/<version>/keyword/`,
  like v1's, and a keyword shared by versions is named after the last
  version that uses it (see [Files](../../style/files.md)): `externalDocs`
  and `example` are `oas/3.2/…`, 3.0's and 3.1's `discriminator` and `xml`
  are `oas/3.1/…`.
- Their checks are what the spec's text says the values are: objects with
  `propertyName` (Discriminator) or `url` (External Documentation)
  required, the types of the fields, `url` a URI reference, and `xml`'s
  `namespace` an absolute URI (an IRI in 3.2). `objectOf` in `checks.js`
  checks an object's named fields.
- Fields the spec doesn't define aren't checked. The meta-schemas don't
  allow them, but the spec's text doesn't say they MUST NOT be there, so
  they're lint (see [Validity and lint](../lint/validity.md)):
  `unknown-field`, a warning in every OpenAPI preset. Its fields are a
  table by keyword URI, because 3.2's `discriminator` and `xml` have
  fields 3.1's don't. `x-` fields are allowed in every one, though 3.0's
  Discriminator Object, unlike the others and unlike 3.1's, doesn't say it
  MAY be extended. 3.0 and 3.1 share the keyword, so telling them apart
  would be the rule's only check of the dialect, and the omission looks
  like an oversight 3.1 fixed. Rejected: keywords exporting their
  `objectOf` fields for the rule, which is API on `Keyword` for one rule.
- `example` is deprecated in 3.1 and 3.2 in favor of `examples`, and
  isn't in 3.0, which has no `examples`. It's one keyword in every
  version, so `deprecated-example` is in the 3.1 and 3.2 presets, at
  `warn` ("discouraged", not a MUST). It suggests the dialect's name for
  `examples`, and a dialect without it isn't reported, so it's right in
  3.0 too.
- 3.2 deprecates `xml`'s `attribute` and `wrapped` for `nodeType`:
  `attribute: true` is `nodeType: "attribute"`, `wrapped: true` is
  `nodeType: "element"`, and `false` is the default.
  `deprecated-xml-field` reports them, at `warn` in `openapi-3-2`. It
  finds 3.2's `xml` by URI, which no other version has.
- `wrapped` "MAY be used only for an array definition", and 3.2 says it
  "takes effect only when defined alongside `type` being `"array"`", so
  `wrapped: true` elsewhere has no effect. `wrapped-without-array`
  reports it, at `warn` in every OpenAPI preset. `type` is what lowers to
  `typeIs` in the same schema, which covers 3.0's `type`. In 3.2, where
  `wrapped` is deprecated, `deprecated-xml-field` reports it too.

## Formats

- `password` (`formats/oas/3.2/password.js`) is "a hint to obscure the
  value", so every string is valid. It's defined so that it isn't an
  unsupported format when formats are validated. Its URI is named like the
  keywords'.
- `int32` (`formats/oas/3.2/int32.js`) is a number from -2^31 to 2^31 - 1
  with no fraction, `isInt32` from `@hyperjump/json-schema-formats`.
- The other formats OpenAPI defines aren't, because they're deprecated or
  don't say exactly what's valid (see the package's registry formats):
  `byte` is deprecated for `contentEncoding`, `binary` has no encoding in
  a JSON string, `float` and `double` don't say whether a value has to be
  exactly representable, and `int64` has no syntax for the string it
  recommends past 2^53.

## Tests

- 3.1 and 3.2 run 2020-12's test suite in the dialect of their latest
  dated meta-schema, which is in each test case's registry (the runner's
  `metaSchemas`), and pass all of it. The meta-schemas are copies of the
  published ones, in `meta-schemas/`.
- 3.0 runs draft-04's, with formats validated as the suite expects. Test
  cases that use what 3.0 doesn't have are skipped, by why: `id`,
  `definitions`, `patternProperties`, `dependencies`, `additionalItems` and
  array `items`, and `type` arrays and `null`.

## Known limitations

- `int64`, `float`, `double`, `byte`, and `binary` aren't defined (see
  [Formats](#formats)). In 3.0, a format the dialect
  doesn't have is only an annotation. In 3.1 and 3.2 with
  `validateFormats`, it's an unsupported format, which is an error.
- Boolean schemas are allowed in 3.0, which doesn't have them. A boolean
  where a schema goes is a boolean schema in every dialect.
- Requirements across keywords that the implementation recovers from
  aren't checked yet, and would be lint rules: `discriminator`
  without `oneOf`, `anyOf`, or `allOf`.
  The discriminator's rules wait for a model of the OpenAPI document (see
  [Not done](#not-done)). It's built on schema names, the keys of the
  Components Object's `schemas`, for implicit mapping, `mapping` values,
  and finding the schemas whose `allOf` references a parent with a
  `discriminator`.

## Not done

- Schemas in OpenAPI documents, like
  `openapi.json#/components/schemas/Pet`. v1 read the whole document as a
  schema, so a pointer into it went through unknown keywords. Here, an
  unknown keyword's value is data, not a schema, so compiling from there
  fails. A media type for OpenAPI documents would find the Schema Objects
  where each version puts them and resolve them as schemas, with
  `jsonSchemaDialect` as their default dialect.
- The OpenAPI document schemas aren't included, like the official
  meta-schemas (see [Built-in dialects](README.md#meta-schemas)).
