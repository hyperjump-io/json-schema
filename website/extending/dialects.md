# Custom dialects

A dialect maps keyword names to keyword URIs and says what unknown keywords
mean. Most custom dialects don't need code:

- **To add keywords or formats to a dialect**, use `extendDialect`, as in
  [Custom keywords](keywords.md).
- **In 2019-09 and 2020-12**, a meta-schema with `$vocabulary` defines its
  own dialect. See [Dialects](../guides/dialects.md#custom-meta-schemas).

Write a dialect of your own for one whose meta-schema doesn't define it,
like one based on draft-07, or one whose meta-schema describes itself, and
put it in the `dialects` config.

```typescript
import { v1Dialect } from "@hyperjump/json-schema/v1";

const { $id, $ref, $defs, type, properties } = v1Dialect.keywords;

const myDialect = {
  uri: "https://example.com/dialect",
  keywords: { $id, $ref, $defs, type, properties, even: evenKeyword },
  formats: { hex: hexFormat },
  unknownKeywords: "error",
  assertFormats: true
};

const jsonSchema = new JsonSchema({ dialects: [myDialect] });
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
| `keywords` | Keyword names, mapped to keyword definitions. `$schema` is in every dialect, so leave it out. Names can't start with `x-`, which are for schema authors. |
| `unknownKeywords` | What a property that isn't a keyword means: `"error"`, `"annotation"`, or `"ignore"` |
| `formats` | Format names, mapped to format definitions |
| `assertFormats` | Whether `format` validates by default |
| `vocabularies` | Vocabularies `$vocabulary` can use, for a dialect whose meta-schemas define dialects |

A built-in keyword's definition is in the dialect it's from, like
`v1Dialect.keywords.type`. A keyword or format can also be its URI, for a
definition in the config's `keywords` or `formats`. A keyword named by a
URI that nothing defines is an error when the `JsonSchema` is created. A
format that nothing defines isn't supported.

A dialect only has the keywords you give it, even `$id` and `$ref`. Without
`$id`, a schema in your dialect has no identifier.

A dialect's URI should be the URI of its meta-schema, so tools that
retrieve `$schema` find one. A dialect can only be in the config once.

## In TypeScript

`SchemaOf` makes the type of a schema in your dialect, for checking
schemas as they're written (see
[Schemas in TypeScript](../guides/typescript.md)). Give it the types of its
keywords by name, its URI, and what unknown keywords mean. The built-in
dialects' keyword types are exported, like `V1Keywords`, and a custom
keyword's type comes from its definition (see
[Custom keywords](keywords.md#in-typescript)).

```typescript
import type { SchemaOf } from "@hyperjump/json-schema";
import type { V1Keywords } from "@hyperjump/json-schema/v1";

type MySchema = SchemaOf<
  Pick<V1Keywords, "$id" | "$ref" | "$defs" | "type" | "properties">
    & { even: typeof evenKeyword },
  "https://example.com/dialect",
  "error"
>;

const count = { type: "integer", minimum: 0 } satisfies MySchema;
```

```text
Object literal may only specify known properties, and 'minimum' does not exist in type ...
```

With `"error"`, only the dialect's keywords and names starting with `x-`
are allowed. With `"annotation"` or `"ignore"`, any property is.
