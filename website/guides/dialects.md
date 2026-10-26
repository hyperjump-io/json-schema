# Dialects

A dialect is a version of JSON Schema, like draft-07 or 2020-12. It decides
which keywords there are and what they mean. A schema says which dialect
it's written in with `$schema`.

## Adding dialects

A `JsonSchema` starts without any dialects, so your application only loads
the ones it uses. Add each one from its module.

```javascript
import { JsonSchema } from "@hyperjump/json-schema";
import { addDraft202012 } from "@hyperjump/json-schema/draft-2020-12";
import { addDraft07 } from "@hyperjump/json-schema/draft-07";

const jsonSchema = new JsonSchema();
addDraft202012(jsonSchema);
addDraft07(jsonSchema);
```

| Dialect | Module | Function | Dialect URI |
| --- | --- | --- | --- |
| v1 | `@hyperjump/json-schema/v1` | `addV1` | `https://json-schema.org/v1` |
| 2020-12 | `@hyperjump/json-schema/draft-2020-12` | `addDraft202012` | `https://json-schema.org/draft/2020-12/schema` |
| 2019-09 | `@hyperjump/json-schema/draft-2019-09` | `addDraft201909` | `https://json-schema.org/draft/2019-09/schema` |
| draft-07 | `@hyperjump/json-schema/draft-07` | `addDraft07` | `http://json-schema.org/draft-07/schema#` |
| draft-06 | `@hyperjump/json-schema/draft-06` | `addDraft06` | `http://json-schema.org/draft-06/schema#` |
| draft-04 | `@hyperjump/json-schema/draft-04` | `addDraft04` | `http://json-schema.org/draft-04/schema#` |

Each module also exports its dialect URI, like `v1DialectUri` and
`draft202012DialectUri`, for code that needs to name it.

Dialects don't depend on each other, and schemas in different dialects can
reference each other. A draft-07 schema can `$ref` a 2020-12 schema, and
each is evaluated by the rules of its own dialect.

## Schemas without `$schema`

There's no default dialect. A schema without `$schema` is an error, unless
it gets its dialect from somewhere else:

- A schema embedded in another schema has the dialect of the schema it's in.
- A schema in a registry can be given one with the `dialectUri` option (see
  [Loading schemas](loading-schemas.md#schemas-without-id)).
- An HTTP response can say with a `schema` parameter on its `Content-Type`.
- The `defaultDialectUri` config is the dialect of every schema that still
  doesn't have one.

```javascript
const jsonSchema = new JsonSchema({
  defaultDialectUri: "https://json-schema.org/v1"
});
```

A default makes your schemas depend on your configuration, so other tools
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
lint rule reports them, with a suggestion when it looks like a misspelling.

## Custom meta-schemas

In 2019-09 and 2020-12, a meta-schema can define a dialect of its own with
`$vocabulary`, choosing which vocabularies of keywords it uses. A schema
whose `$schema` is that meta-schema's URI uses that dialect. You don't need
to add it. It's built the first time a schema uses it, so the meta-schema
only needs to be somewhere it can be found, like a registry.

To use a vocabulary of your own in a meta-schema, add it with
`addVocabulary` from `@hyperjump/json-schema/draft-2020-12` or
`@hyperjump/json-schema/draft-2019-09`. To make a dialect any other way, see
[Custom dialects](../extending/dialects.md).
