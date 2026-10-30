# Dialects

A dialect is a version of JSON Schema, like draft-07 or 2020-12. It decides
which keywords there are and what they mean. A schema says which dialect
it's written in with `$schema`.

## Choosing dialects

A `JsonSchema` only has the dialects in its `dialects` config, so your
application only loads the ones it uses. Import each one from its module.
Each dialect brings its own keywords and formats. You can't change the
dialects after the `JsonSchema` is created.

```typescript
import { JsonSchema } from "@hyperjump/json-schema";
import { draft202012Dialect } from "@hyperjump/json-schema/draft-2020-12";
import { draft07Dialect } from "@hyperjump/json-schema/draft-07";

const jsonSchema = new JsonSchema({ dialects: [draft202012Dialect, draft07Dialect] });
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
- The `defaultDialectUri` config sets the dialect for every schema that
  still doesn't have one.

```typescript
const jsonSchema = new JsonSchema({
  dialects: [v1Dialect],
  defaultDialectUri: "https://json-schema.org/v1"
});
```

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

## Custom meta-schemas

In 2019-09 and 2020-12, a meta-schema can define its own dialect with
`$vocabulary`. `$vocabulary` chooses which vocabularies of keywords the
dialect uses. A schema whose `$schema` is that meta-schema's URI uses that
dialect.

This kind of dialect doesn't go in the config. It's built the first time a
schema uses it, so the meta-schema only needs to be somewhere it can be
found, like a registry. The meta-schema's own dialect, like 2020-12, does
need to be in the config. That dialect brings the vocabularies 2020-12
defines.

To use your own vocabulary in a meta-schema, add it to the `vocabularies`
config by its URI. Its keywords are definitions, just like a dialect's. See
[Custom keywords](../extending/keywords.md).

```typescript
const jsonSchema = new JsonSchema({
  dialects: [draft202012Dialect],
  vocabularies: {
    "https://example.com/vocab/even": { keywords: { even: evenKeyword } }
  }
});
```

To make a dialect any other way, see [Custom dialects](../extending/dialects.md).
