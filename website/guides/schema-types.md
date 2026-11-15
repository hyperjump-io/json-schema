# Schema types

A schema in your code is checked as you write it. Each dialect has a type.
A misspelled keyword or a value of the wrong type is a type error anywhere
in the schema. Nothing changes at runtime. The types only check what you
write.

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

Use `satisfies` rather than a type annotation so that `person` keeps its
own type. A schema declared `as const` fits too.

## Schemas you pass to operations

A config knows the schema type of the dialects its JSON Schema media types
were made with. When you pass a schema as a value to `validate`,
`validator`, `compile`, or `bundle`, it's checked without you naming a
type. A config from `jsonSchemaConfig({ dialects: [v1Dialect] })`
checks schemas against `V1Schema`. A URI isn't checked.

```typescript
import { jsonSchemaConfig, validate } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const config = jsonSchemaConfig({ dialects: [v1Dialect] });

await validate(config, {
  $schema: "https://json-schema.org/v1",
  type: "string",
  minLenght: 1
}, "Jason");
```

```text
Object literal may only specify known properties, but 'minLenght' does not exist in type ...
```

With more than one dialect, the type is the union of their types. A
session has the same type as its config. A config whose media types have
no dialects accepts any schema. To use the type in a function of your own,
use `SchemaTypeOf<typeof config>`.

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

How strict a type is depends on what its dialect says about unknown
keywords:

- **v1** makes an unknown keyword an error. Its type only allows v1's
  keywords and names starting with `x-`. An `x-` property can have any
  value. The type includes `conditional`, `itemPattern`, and
  `requireAllExcept`, which `v1Dialect` has.
- **2020-12 and earlier** allow unknown keywords. Their types allow any
  property, so a misspelled keyword isn't an error. The values of the
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

`$schema` can end with `#`, which draft-04 through draft-07 schemas
usually do.

## In a registry

A registry's type parameter is the type of schema it takes. Give it the
type of your dialects, and a schema you add to it is checked:

```typescript
new SchemaRegistry<V1Schema>().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  type: "object",
  properties: { name: { type: "string", minLenght: 1 } }
});
```

```text
Object literal may only specify known properties, but 'minLenght' does not exist in type ...
```

Every schema added to it is checked. That includes schemas passed to the
constructor, to `with`, and to the registries `with` returns. The type can
be a dialect's type or come from a config:
`new SchemaRegistry<SchemaTypeOf<typeof config>>()`. A registry without
a type accepts any JSON, and the config and every call take a registry of
any type. JSON text isn't checked, because its type is `string`.

For schemas in more than one dialect, give it a union. A schema's
`$schema` decides which type in the union it has to fit. A schema without
`$schema` only has to fit one of them. If 2020-12 is in the union, a
misspelled keyword will fit.

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

Schemas and instances are only read, so they can be readonly. You can add a
schema declared `as const` to a registry. You can pass an instance declared
`as const` to `validate` and `annotate`.

```typescript
const person = {
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  type: "object",
  properties: { name: { type: "string" } }
} as const satisfies V1Schema;

const registry = new SchemaRegistry<V1Schema>().with(person);

const jason = { name: "Jason" } as const;
await validate(config, "https://example.com/person", jason, { registry }); // true
```

## Custom keywords

A dialect extended with `extendDialect` has types for the keywords it
adds. A config with that dialect checks schemas that use them.
Subschemas have the same type, so they can use your keywords too.

```typescript
const config = jsonSchemaConfig({
  dialects: [extendDialect(v1Dialect, { keywords: { even: evenKeyword } })]
});

await validate(config, { type: "integer", even: 2 }, 4);
```

```text
Type 'number' is not assignable to type 'boolean | undefined'.
```

To name the type, pass your keywords to the dialect's type. Use the names
they have in the dialect:

```typescript
type MySchema = V1Schema<{ even: typeof evenKeyword }>;

const count = {
  type: "integer",
  even: true,
  not: { even: true, minimum: 10 }
} satisfies MySchema;
```

[Custom keywords](../extending/keywords.md#schemas-that-use-it) shows where
`evenKeyword` comes from. It also shows how a keyword's definition sets the
type of its value. Declare a keyword with `satisfies Keyword` before the
config so its type keeps its shape. A keyword written inside the config can
lose its parameter types.

A dialect of your own has a type too. `DialectSchema` builds it from the
dialect's keywords. A keyword named by a URI allows any value. See
[Custom dialects](../extending/dialects.md#its-schema-type).

## What isn't checked

- **What a keyword checks itself.** A negative `minLength`, a `pattern`
  that isn't a regular expression, and a duplicate in `type` all fit the
  type. They're still reported when the schema is used.
- **Formats.** `format` can be any string, because whether it validates is
  a matter of configuration.
- **Embedded schemas in other dialects.** The type treats the whole schema
  as one dialect. An embedded schema with a different `$schema` doesn't fit
  the type.
- **Ignored siblings of `$ref`.** In draft-04 through draft-07, `$ref`
  causes its siblings to be ignored, but the type still checks them.
- **Dialects from a meta-schema.** A dialect defined by a meta-schema's
  `$vocabulary` doesn't have a type unless you write one with `SchemaOf`.
