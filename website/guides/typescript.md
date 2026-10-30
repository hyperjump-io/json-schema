# Schemas in TypeScript

A schema written in TypeScript can be checked as it's written. Each dialect
has a type, so a misspelled keyword or a value of the wrong type is a type
error, anywhere in the schema. Nothing changes at runtime: the types only
check what you write.

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
Object literal may only specify known properties, but 'minLenght' does not exist in type ... Did you mean to write 'minLength'?
```

Use `satisfies` rather than a type annotation, so `person` keeps its own
type. A schema declared `as const` fits too.

## The dialects' types

Each dialect's type is in the module that adds it:

| Dialect | Type | Module |
| --- | --- | --- |
| v1 | `V1Schema` | `@hyperjump/json-schema/v1` |
| 2020-12 | `Draft202012Schema` | `@hyperjump/json-schema/draft-2020-12` |
| 2019-09 | `Draft201909Schema` | `@hyperjump/json-schema/draft-2019-09` |
| draft-07 | `Draft07Schema` | `@hyperjump/json-schema/draft-07` |
| draft-06 | `Draft06Schema` | `@hyperjump/json-schema/draft-06` |
| draft-04 | `Draft04Schema` | `@hyperjump/json-schema/draft-04` |

How strict a type is follows what its dialect says about unknown keywords:

- **v1** makes an unknown keyword an error, so its type only allows the
  keywords v1 has, and names starting with `x-`, which can have any
  value. It includes `conditional`, `itemPattern`, and `requireAllExcept`,
  which `v1Dialect` has.
- **2020-12 and earlier** allow an unknown keyword, so their types allow
  any property, and a misspelled keyword isn't an error. The values of the
  dialect's keywords are still checked.

```typescript
import type {
  Draft202012Schema
} from "@hyperjump/json-schema/draft-2020-12";

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
to it is checked, by the constructor, `with`, and the registries `with`
returns. A registry without a type takes any JSON. JSON text isn't
checked, because its type is `string`.

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

For schemas in more than one dialect, give it a union. A schema's
`$schema` says which type in the union it has to fit. A schema without
`$schema` only has to fit one of them, so with 2020-12 in the union, a
misspelled keyword fits.

```typescript
const registry = new SchemaRegistry<V1Schema | Draft202012Schema>()
  .with({
    $schema: "https://json-schema.org/v1",
    type: "string",
    minLenght: 1 // An error: v1 doesn't have minLenght
  })
  .with({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "string",
    minLenght: 1 // Not an error: 2020-12 allows unknown keywords
  });
```

## Readonly values

Schemas and instances are only read, so they can be readonly. A schema
declared `as const` can be added to a registry, and an instance declared
`as const` can be passed to `validate` and `annotate`.

```typescript
const person = {
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  type: "object",
  properties: { name: { type: "string" } }
} as const satisfies V1Schema;

jsonSchema.registry = new SchemaRegistry<V1Schema>().with(person);

const jason = { name: "Jason" } as const;
await validate(jsonSchema, "https://example.com/person", jason); // true
```

## Custom keywords

A dialect's type can be given the types of your keywords, by the names
they have in the dialect. Their subschemas are the same type, so they can
use your keywords too.

```typescript
type MySchema = V1Schema<{ even: typeof evenKeyword }>;

const count = {
  type: "integer",
  even: true,
  not: { even: true, minimum: 10 }
} satisfies MySchema;
```

Where `evenKeyword` comes from, and how a keyword's definition gives the
type of its value, is in
[Custom keywords](../extending/keywords.md#in-typescript). A dialect of
your own has a type made with `SchemaOf`. See
[Custom dialects](../extending/dialects.md#in-typescript).

## What isn't checked

- **What a keyword checks itself.** A negative `minLength`, a `pattern`
  that isn't a regular expression, and a duplicate in `type` fit the type.
  They're still reported when the schema is used.
- **Formats.** `format` can be any string, because whether it validates is
  configuration.
- **Embedded schemas in other dialects.** The whole schema is one dialect,
  so an embedded schema with a different `$schema` doesn't fit the type.
- **Ignored siblings of `$ref`.** In draft-04 through draft-07, `$ref`
  makes its siblings ignored, but the type still checks them.
- **Dialects from a meta-schema.** A dialect defined by a meta-schema's
  `$vocabulary` doesn't have a type unless you write one with `SchemaOf`.
