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

## Other dialects

Each dialect has a type, from the module that adds it:

| Dialect | Type | Module |
| --- | --- | --- |
| v1 | `V1Schema` | `@hyperjump/json-schema/v1` |
| 2020-12 | `Draft202012Schema` | `@hyperjump/json-schema/draft-2020-12` |
| 2019-09 | `Draft201909Schema` | `@hyperjump/json-schema/draft-2019-09` |
| draft-07 | `Draft07Schema` | `@hyperjump/json-schema/draft-07` |
| draft-06 | `Draft06Schema` | `@hyperjump/json-schema/draft-06` |
| draft-04 | `Draft04Schema` | `@hyperjump/json-schema/draft-04` |

In 2020-12 and earlier, an unknown keyword is allowed, so the type allows
any keyword, and a misspelled one isn't an error. The values of the
dialect's keywords are still checked. In draft-04 through draft-07, the
type doesn't know that `$ref` makes its siblings ignored.

```typescript
import type { Draft202012Schema } from "@hyperjump/json-schema/draft-2020-12";

const person = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    name: { type: "string", minLength: "1" }
  }
} satisfies Draft202012Schema;
```

```text
Type 'string' is not assignable to type 'number'.
```

`$schema` can end with `#`, as draft-04 through draft-07 schemas usually
do.

## In a registry

Give a registry the type of the schemas it takes, and every schema added
to it is checked, including by the registries `with` returns. JSON text
isn't checked.

A union takes schemas in more than one dialect, and `$schema` says which
type a schema has to fit. A schema without `$schema` only has to fit one,
so in `SchemaRegistry<V1Schema | Draft202012Schema>`, a misspelled keyword
fits 2020-12.

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

Values that are only read can be readonly, so a schema or an instance
declared `as const` can be passed to a registry, `validate`, and
`annotate`.

## What isn't checked

- **What a keyword checks itself.** A negative `minLength`, a `pattern`
  that isn't a regular expression, and a duplicate in `type` fit the type.
  They're still reported when the schema is used.
- **Formats.** `format` can be any string, because it only validates when
  formats are validated.
- **Embedded schemas in other dialects.** The whole schema is one dialect,
  so an embedded schema with a different `$schema` doesn't fit the type.

## Custom keywords

Give a dialect's type the types of your keywords, by the names you give
them in the dialect. A keyword's type comes from its definition's type, so declare
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
