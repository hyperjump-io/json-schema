# Custom dialects

A dialect maps keyword names to keyword URIs. It also says what unknown
keywords mean. Most custom dialects don't need code:

- **To add keywords or formats to a dialect**, use `extendDialect`. See
  [Custom keywords](keywords.md).
- **In 2019-09 and 2020-12**, a meta-schema with `$vocabulary` defines its
  own dialect. See [Dialects](../guides/dialects.md#custom-meta-schemas).

Write your own dialect when its meta-schema doesn't define it. Examples are
a dialect based on draft-07 or one whose meta-schema describes itself. Put
it in the `dialects` option of `jsonSchemaConfig`.

```typescript
import type { DialectConfig } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const { $id, $ref, $defs, type, properties } = v1Dialect.keywords;

const myDialect = {
  uri: "https://example.com/dialect" as const,
  keywords: { $id, $ref, $defs, type, properties, even: evenKeyword },
  formats: { hex: hexFormat },
  unknownKeywords: "error",
  assertFormats: true
} satisfies DialectConfig;

const config = jsonSchemaConfig({ dialects: [myDialect] });
```

```json
{
  "$schema": "https://example.com/dialect",
  "type": "object",
  "properties": {
    "count": { "type": "integer", "even": true }
  }
}
```

| Property | What it is |
| --- | --- |
| `uri` | The dialect's URI, which schemas use as `$schema` |
| `keywords` | Maps keyword names to keyword definitions. `$schema` is in every dialect, so leave it out. Names can't start with `x-`, because those are for schema authors. |
| `unknownKeywords` | What a property that isn't a keyword means: `"error"`, `"annotation"`, or `"ignore"` |
| `formats` | Maps format names to format definitions |
| `assertFormats` | Whether `format` validates by default |
| `vocabularies` | Vocabularies that `$vocabulary` can use. For a dialect whose meta-schemas define dialects. |

A built-in keyword's definition is in the dialect it comes from, like
`v1Dialect.keywords.type`. A keyword or format can also be given as a URI.
Then its definition comes from the `keywords` or `formats` option of
`jsonSchemaConfig`. If a keyword is named by a URI that nothing
defines, `jsonSchemaConfig` throws. A format that nothing defines isn't supported.

A dialect only has the keywords you give it. That includes `$id` and
`$ref`. Without `$id`, a schema in your dialect has no identifier.

A dialect's URI should be the URI of its meta-schema. That way tools that
retrieve `$schema` find a meta-schema. A dialect can only be in `dialects`
once.

Declare a dialect with `satisfies DialectConfig` instead of a type
annotation, so `unknownKeywords` keeps its literal type. Declare its URI
`as const`. Then its schemas have a type. See
[Its schema type](#its-schema-type).

## Its schema type

A dialect's schema type comes from its keywords. A config with your
dialect checks schemas passed to operations as values. See
[Schema types](../guides/schema-types.md). `DialectSchema` names the type.
A keyword named by a URI, with its definition in the `keywords` option,
allows any value.

```typescript
import type { DialectSchema } from "@hyperjump/json-schema";

type MySchema = DialectSchema<typeof myDialect>;

const count = { type: "integer", minimum: 0 } satisfies MySchema;
```

```text
Object literal may only specify known properties, and 'minimum' does not exist in type ...
```

With `"error"`, only the dialect's keywords and names starting with `x-`
are allowed. With `"annotation"` or `"ignore"`, any property is allowed.

`SchemaOf` makes the same type for a dialect you don't have as a value,
like one a meta-schema defines. It takes the keyword types by name, a URI,
and what unknown keywords mean. The built-in dialects' keyword types are
exported, like `V1Keywords`.

```typescript
import type { SchemaOf } from "@hyperjump/json-schema";
import type { V1Keywords } from "@hyperjump/json-schema/v1";

type MySchema = SchemaOf<
  Pick<V1Keywords, "$id" | "$ref" | "$defs" | "type" | "properties">
    & { even: typeof evenKeyword },
  "https://example.com/dialect",
  "error"
>;
```
