# Schemas in TypeScript

A schema written in TypeScript can be checked as it's written. `V1Schema` is
the type of a JSON Schema v1 schema, so a misspelled keyword or a value of
the wrong type is a type error, anywhere in the schema.

```typescript
import type { V1Schema } from "@hyperjump/json-schema/v1";

const person = {
  $schema: "https://json-schema.org/v1",
  type: "object",
  properties: {
    name: { type: "string", minLenght: 1 }
  }
} satisfies V1Schema;
```

```text
Object literal may only specify known properties, but 'minLenght' does not
exist in type ... Did you mean to write 'minLength'?
```

Use `satisfies` rather than a type annotation, so `person` keeps its own
type. A schema declared `as const` fits too.

Unknown keywords are errors in v1, so the type only allows the keywords the
dialect has, and ones starting with `x-`, which can have any value. It
includes `conditional`, `itemPattern`, and `requireAllExcept`, which
`addV1` adds.

## In a registry

Give a registry the type of the schemas it takes, and every schema added
to it is checked, including by the registries `with` returns. A union
takes schemas in more than one dialect. JSON text isn't checked.

```typescript
import { SchemaRegistry } from "@hyperjump/json-schema";
import type { V1Schema } from "@hyperjump/json-schema/v1";

const registry = new SchemaRegistry<V1Schema>().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  type: "object",
  properties: { name: { type: "string" } }
});
```

A registry without a type takes any JSON.

## What isn't checked

- **What a keyword checks itself.** A negative `minLength`, a `pattern`
  that isn't a regular expression, and a duplicate in `type` fit the type.
  They're still reported when the schema is used.
- **Formats.** `format` can be any string, because it only validates when
  formats are validated.
- **Other dialects.** The whole schema is v1, so an embedded schema with a
  different `$schema` doesn't fit the type.

## Custom keywords

Give `V1Schema` the types of your keywords, by the names you give them in
the dialect. A keyword's type comes from its definition's type, so declare
the keyword with `satisfies Keyword`, which keeps its `shape` as written.

```typescript
import type { Keyword } from "@hyperjump/json-schema";
import type { V1Schema } from "@hyperjump/json-schema/v1";

const evenKeyword = {
  uri: "https://example.com/keyword/even",
  shape: "data",
  lower: (even: boolean) => even
    ? { op: "multipleOf", divisor: 2 }
    : { op: "pass" }
} satisfies Keyword<boolean>;

type MySchema = V1Schema<{ even: typeof evenKeyword }>;

const schema = {
  type: "integer",
  even: true
} satisfies MySchema;
```

The type of a keyword's value comes from its shape. A `"schema"` is a
schema of the same type, so the subschemas of your keyword can use your
keyword too. A `"reference"` is a string, and `{ array: ... }` and
`{ map: ... }` are arrays and objects. `"data"` is the type `lower` gets
(`boolean`, above). A keyword without a type for `lower` can have any JSON
value there.

| Shape | Type of `lower`'s value | Type in a schema |
| --- | --- | --- |
| `"data"` | `number` | `number` |
| `"schema"` | `Expression` | A schema |
| `{ array: "schema" }` | `Expression[]` | An array of schemas |
| `{ map: "schema" }` | `[string, Expression][]` | An object of schemas |
| `["schema", { array: "data" }]` | `Expression \| string[]` | A schema or an array of strings |

For a dialect of your own, `SchemaOf` builds the type from the types of its
keywords, its URI, and what an unknown keyword means:

```typescript
import type { SchemaOf } from "@hyperjump/json-schema";
import type { V1Keywords } from "@hyperjump/json-schema/v1";

type StrictSchema = SchemaOf<
  Omit<V1Keywords, "$dynamicRef" | "$dynamicAnchor">,
  "https://example.com/strict",
  "error"
>;
```
