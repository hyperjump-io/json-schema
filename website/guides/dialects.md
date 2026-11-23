# Dialects

A dialect is a version of JSON Schema, like draft-07 or 2020-12. It decides
which keywords there are and what they mean. A schema says which dialect
it's written in with `$schema`.

## Choosing dialects

The JSON Schema media types only have the dialects in the `dialects`
option of `jsonSchemaConfig`, so only the ones you use are loaded. Import each one from its module. Each dialect brings its own
keywords and formats. You can't change the dialects after the media types
are made.

```typescript
import { jsonSchemaConfig } from "@hyperjump/json-schema";
import { draft202012Dialect } from "@hyperjump/json-schema/draft-2020-12";
import { draft07Dialect } from "@hyperjump/json-schema/draft-07";

const config = jsonSchemaConfig({
  dialects: [draft202012Dialect, draft07Dialect]
});
```

| Dialect | Module | Export | Dialect URI |
| --- | --- | --- | --- |
| v1 | `@hyperjump/json-schema/v1` | `v1Dialect` | `https://json-schema.org/v1` |
| 2020-12 | `@hyperjump/json-schema/draft-2020-12` | `draft202012Dialect` | `https://json-schema.org/draft/2020-12/schema` |
| 2019-09 | `@hyperjump/json-schema/draft-2019-09` | `draft201909Dialect` | `https://json-schema.org/draft/2019-09/schema` |
| draft-07 | `@hyperjump/json-schema/draft-07` | `draft07Dialect` | `http://json-schema.org/draft-07/schema#` |
| draft-06 | `@hyperjump/json-schema/draft-06` | `draft06Dialect` | `http://json-schema.org/draft-06/schema#` |
| draft-04 | `@hyperjump/json-schema/draft-04` | `draft04Dialect` | `http://json-schema.org/draft-04/schema#` |

Each module also exports its dialect URI for code that needs it. Examples
are `v1DialectUri` and `draft202012DialectUri`.

Dialects don't depend on each other. Schemas in different dialects can
still reference each other. A draft-07 schema can `$ref` a 2020-12 schema,
and each one is evaluated by the rules of its own dialect.

## Schemas without `$schema`

There's no default dialect. A schema without `$schema` is an error unless
it gets its dialect from somewhere else:

- A schema embedded in another schema has the dialect of the schema it's in.
- A schema in a registry can be given one with the `dialectUri` option. See
  [Loading schemas](loading-schemas.md#schemas-without-id).
- An HTTP response can name it with a `schema` parameter on its
  `Content-Type`.
- The `defaultDialects` option of `jsonSchemaConfig` gives documents a
  dialect by their URL.
- A schema given to a call as a value, like a boolean schema, can be given
  one with the call's `dialectUri` option.

```typescript
const config = jsonSchemaConfig({
  dialects: [v1Dialect],
  defaultDialects: {
    "./schemas/": "https://json-schema.org/v1",
    "./legacy/person.json": "https://json-schema.org/v1"
  }
});
```

A key that ends with `/` is for everything under it, and any other key is
only for itself. When more than one matches, the longest wins. A relative
key is resolved against the working directory in Node.js, and the page in
a browser. A JSON file a key matches, and that doesn't have `$schema`, is a
schema in that dialect, so a reference to `./schemas/pet.json` finds a
schema. A JSON file whose `$schema` isn't a dialect is still JSON, because
that `$schema` is an instance's schema. Keep data files out of the folders
your keys name, or name schema files one at a time.

A default makes your schemas depend on your configuration. Other tools
won't know how to read them. Prefer giving every schema `$schema`. The
[`implicit-dialect`](../linting/rules/implicit-dialect.md) lint rule reports
schemas that don't.

## Unknown keywords

What a property that isn't a keyword means depends on the dialect:

| Dialect | An unknown keyword is |
| --- | --- |
| v1 | An error, unless its name starts with `x-`. Then it's an annotation. |
| 2019-09, 2020-12 | An annotation |
| draft-04 to draft-07 | Ignored |

In every dialect, the [`unknown-keyword`](../linting/rules/unknown-keyword.md)
lint rule reports them. It suggests a fix when one looks like a
misspelling.

## Patterns

`pattern` and `patternProperties` are ECMA-262 regular expressions with the
`u` flag, so `.` matches a whole character and `\p{L}` matches any letter.
Some patterns are only valid without the flag, usually because they escape
punctuation that doesn't need it, like `\&` or `\%`:

| Dialect | A pattern that's only valid without the `u` flag |
| --- | --- |
| v1 | Is an error |
| draft-04 to 2020-12 | Works without the flag |

Without the flag, `.` matches half of a character outside the Basic
Multilingual Plane, like an emoji.

In every dialect, the `regex` format needs a pattern that's valid with the
`u` flag.

## OpenAPI

The dialects of OpenAPI's Schema Objects, and reading the Schema Objects
in OpenAPI documents, are in
[`@hyperjump/openapi`](https://github.com/hyperjump-io/openapi/blob/main/website/dialects.md).

## Custom meta-schemas

In 2019-09 and 2020-12, a meta-schema can define its own dialect with
`$vocabulary`. `$vocabulary` chooses which vocabularies of keywords the
dialect uses. A schema whose `$schema` is that meta-schema's URI uses that
dialect.

This kind of dialect doesn't go in `dialects`. It's built the first time a
schema uses it, so the meta-schema only needs to be somewhere it can be
found, like a registry. The meta-schema's own dialect, like 2020-12, does
need to be in `dialects`. That dialect brings the vocabularies 2020-12
defines.

To use your own vocabulary in a meta-schema, add it to the `vocabularies`
option by its URI. Its keywords are definitions, just like a dialect's. See
[Custom keywords](../extending/keywords.md).

```typescript
const config = jsonSchemaConfig({
  dialects: [draft202012Dialect],
  vocabularies: {
    "https://example.com/vocab/even": { keywords: { even: evenKeyword } }
  }
});
```

To make a dialect any other way, see [Custom dialects](../extending/dialects.md).
