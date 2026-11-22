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
| OpenAPI 3.0 | `@hyperjump/json-schema/openapi-3-0` | `openApi30Dialect` | `https://spec.openapis.org/oas/3.0/dialect` |

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
- The `defaultDialectUri` option of `jsonSchemaConfig` sets the
  dialect for every schema that still doesn't have one.

```typescript
const config = jsonSchemaConfig({
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
| v1, OpenAPI 3.0 | An error, unless its name starts with `x-`. Then it's an annotation. |
| 2019-09, 2020-12, OpenAPI 3.1, OpenAPI 3.2 | An annotation |
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
| draft-04 to 2020-12, OpenAPI | Works without the flag |

Without the flag, `.` matches half of a character outside the Basic
Multilingual Plane, like an emoji.

In every dialect, the `regex` format needs a pattern that's valid with the
`u` flag.

## OpenAPI

The OpenAPI dialects are for the Schema Objects in OpenAPI descriptions.
Each one adds OpenAPI's keywords, `discriminator`, `example`,
`externalDocs`, and `xml`, which are annotations. They don't change what's
valid.

To use the Schema Objects in an OpenAPI document, add `openApiMediaType`
from `@hyperjump/json-schema/openapi` to the config's `mediaTypes`. Then a
URI into the document, like `openapi.json#/components/schemas/Pet`, is a
schema. It reads JSON documents served as `application/openapi+json`, and
any `.json` file with a top-level `openapi` and no `$schema`. A Schema
Object's dialect is the document's `jsonSchemaDialect`, or the default for
its version, which the config needs to have. OpenAPI 3.0's default is
`openApi30Dialect`.

```typescript
import { jsonSchemaConfig, validator } from "@hyperjump/json-schema";
import { openApi30Dialect } from "@hyperjump/json-schema/openapi-3-0";
import { openApiMediaType } from "@hyperjump/json-schema/openapi";

const config = jsonSchemaConfig({
  dialects: [openApi30Dialect],
  mediaTypes: [openApiMediaType()]
});

const isPet = await validator(config, "https://example.com/openapi.json#/components/schemas/Pet");
```

### OpenAPI 3.1 and 3.2

OpenAPI 3.1 and 3.2 are 2020-12 with OpenAPI's keywords. 3.2 adds
`defaultMapping` to `discriminator` and `nodeType` to `xml`. Their dialects
are defined by OpenAPI's meta-schemas, like
`https://spec.openapis.org/oas/3.1/dialect/base` and
`https://spec.openapis.org/oas/3.2/dialect/2026-02-26`. Add the 2020-12
dialect and OpenAPI's vocabulary, and a schema whose `$schema` is one of
those URIs gets its dialect from the meta-schema. See
[Custom meta-schemas](#custom-meta-schemas).

The meta-schema has to be in your registry or retrieved. OpenAPI serves
its meta-schemas as `application/octet-stream`, not as JSON. To retrieve
them from `https://spec.openapis.org/`, add `openApiSpecMediaType` from
`@hyperjump/json-schema/openapi` to `mediaTypes`, and the site to
`allowRetrieval`. It reads only that site's `application/octet-stream`.

```typescript
import { jsonSchemaConfig } from "@hyperjump/json-schema";
import { draft202012Dialect } from "@hyperjump/json-schema/draft-2020-12";
import { openApi31Vocabulary, openApi31VocabularyUri } from "@hyperjump/json-schema/openapi-3-1";
import { openApiSpecMediaType } from "@hyperjump/json-schema/openapi";

const config = jsonSchemaConfig({
  dialects: [draft202012Dialect],
  vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
  mediaTypes: [openApiSpecMediaType],
  allowRetrieval: ["https://spec.openapis.org/oas/"]
});
```

3.1 and 3.2 documents without `jsonSchemaDialect` have no default until
you give one. OpenAPI names `https://spec.openapis.org/oas/3.1/dialect/base`
as 3.1's, and each 3.2 dialect is dated. Give `openApiMediaType` the ones
your documents use, by version, as strings. A document without
`jsonSchemaDialect` and without a default for its version is an error.

```typescript
import { jsonSchemaConfig } from "@hyperjump/json-schema";
import { draft202012Dialect } from "@hyperjump/json-schema/draft-2020-12";
import { openApi31Vocabulary, openApi31VocabularyUri } from "@hyperjump/json-schema/openapi-3-1";
import { openApiMediaType, openApiSpecMediaType } from "@hyperjump/json-schema/openapi";

const config = jsonSchemaConfig({
  dialects: [draft202012Dialect],
  vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
  mediaTypes: [
    openApiMediaType({
      defaultDialects: { "3.1": "https://spec.openapis.org/oas/3.1/dialect/base" }
    }),
    openApiSpecMediaType
  ],
  allowRetrieval: ["https://spec.openapis.org/oas/"]
});
```

`defaultDialects` can replace 3.0's default too.

Or download the meta-schemas your schemas use and add them to the registry:

```typescript
import { readFile } from "node:fs/promises";
import { jsonSchemaConfig, SchemaRegistry } from "@hyperjump/json-schema";
import { draft202012Dialect } from "@hyperjump/json-schema/draft-2020-12";
import { openApi31Vocabulary, openApi31VocabularyUri } from "@hyperjump/json-schema/openapi-3-1";

// https://spec.openapis.org/oas/3.1/dialect/base, downloaded
const metaSchema = JSON.parse(await readFile("./oas-3.1-dialect-base.json", "utf8"));

const config = jsonSchemaConfig({
  dialects: [draft202012Dialect],
  vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
  registry: new SchemaRegistry([{ schema: metaSchema }])
});
```

Without the vocabulary, OpenAPI's keywords are unknown keywords, and their
values aren't checked. To lint them, use the `openapi-3-1` or `openapi-3-2`
[preset](../linting/choosing-rules.md#openapi-presets).

| Version | Module | Vocabulary |
| --- | --- | --- |
| OpenAPI 3.2 | `@hyperjump/json-schema/openapi-3-2` | `openApi32Vocabulary` |
| OpenAPI 3.1 | `@hyperjump/json-schema/openapi-3-1` | `openApi31Vocabulary` |

### OpenAPI 3.0

OpenAPI 3.0 is a subset of draft-04. It has no `id`, `definitions`,
`patternProperties`, `dependencies`, or `additionalItems`, and `items` is
one schema. `type` is one type, without `null`. Use `nullable: true` to
allow `null` too. OpenAPI doesn't publish a meta-schema for it, so it's a
dialect, `openApi30Dialect`, in the table of dialects. To lint them, use
the [`openapi-3-0` preset](../linting/choosing-rules.md#openapi-presets).

Schema Objects usually don't have `$schema`, so give them their dialect,
like with the `dialectUri` of a registry entry:

```typescript
import { jsonSchemaConfig, SchemaRegistry, validator } from "@hyperjump/json-schema";
import { openApi30Dialect, openApi30DialectUri } from "@hyperjump/json-schema/openapi-3-0";

const config = jsonSchemaConfig({ dialects: [openApi30Dialect] });
const registry = new SchemaRegistry([{
  schema: { type: "string", nullable: true },
  retrievalUri: "https://example.com/name",
  dialectUri: openApi30DialectUri
}]);

const isName = await validator(config, "https://example.com/name", { registry });
isName(null); // true
```

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
