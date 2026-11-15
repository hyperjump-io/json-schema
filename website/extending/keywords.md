# Custom keywords

A keyword is a plain object with a URI. Give it a name in a dialect with
`extendDialect`. That returns a new dialect. Put the new dialect in the
config in place of the original.

```typescript
import { configureJsonSchema, extendDialect } from "@hyperjump/json-schema";
import type { Keyword } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const evenKeyword = {
  uri: "https://example.com/keyword/even",
  shape: "data",
  check(valueNode, { message }) {
    if (valueNode.jsonType !== "boolean") {
      message("Expected a boolean");
    }
  },
  lower: (even) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
} satisfies Keyword<boolean>;

const jsonSchema = configureJsonSchema({
  dialects: [extendDialect(v1Dialect, { keywords: { even: evenKeyword } })]
});
```

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "integer",
  "even": true
}
```

`Keyword<boolean>` says `lower` gets a boolean, so its parameters are typed
without annotations. Declare a keyword with `satisfies` instead of a type
annotation. That way it keeps its `shape` as written, and its type says
what its value is in a schema. See
[Schemas that use it](#schemas-that-use-it).

To replace a keyword a dialect has, put a definition with the same URI in
the `keywords` config. It's used in every dialect that has the keyword.

```typescript
const jsonSchema = configureJsonSchema({ dialects: [v1Dialect], keywords: [myTypeKeyword] });
```

## The parts of a keyword

| Property | What it's for |
| --- | --- |
| `uri` | Identifies the keyword in every dialect |
| `shape` | Where the keyword's value has schemas in it |
| `check` | Reports problems with the value, like `even: "yes"` |
| `lower` | What the keyword means as a kernel expression |
| `siblings` | Other keywords in the same schema that it reads |
| `evaluate` | Evaluates values itself when the kernel can't express it |

### `shape`

The shape says which parts of the value are schemas. Those parts get
resolved and compiled. Tools that walk schemas, like lint rules and
bundling, can find them without knowing your keyword. The shape also sets
the type of the keyword's value in a schema.

| Shape | The value is | Its type in a schema |
| --- | --- | --- |
| `"data"` | Plain JSON, like `minimum`'s number | What `lower` gets, readonly |
| `"schema"` | A schema, like `not`'s | A schema |
| `"unappliedSchema"` | A schema the keyword doesn't apply, like `contentSchema`'s. It's resolved but not compiled. | A schema |
| `"reference"` | A URI reference, like `$ref`'s | `string` |
| `{ array: shape }` | An array of that shape, like `allOf`'s array of schemas | An array of the shape's type |
| `{ map: shape }` | An object whose values are that shape, like `properties` | An object of the shape's type |
| `[shape, shape]` | Any of the shapes. For example, `items` in draft-07 is a schema or an array of schemas. | Any of the shapes' types |

A schema in the value has the same type as the schema it's in. It can use
the dialect's other keywords, including yours. A `"data"` keyword whose
`lower` doesn't give its value a type can have any JSON.

A value that doesn't fit the shape is a problem with the schema, reported
before `check` is called.

### `check`

`check` reports problems the shape doesn't describe, like a negative
`minLength`. It's called while the schema is resolved, and it gets the
value as a JSON AST node. Call `message` to report a problem. Then the
schema can't be compiled. Without `check`, any value that fits the shape
is allowed.

### `lower`

`lower` says what the keyword means as a kernel expression. It gets the
value parsed according to its shape. A schema is already compiled to
`{ op: "apply", schema: handle }`, which is an expression you can use as
is. A keyword that has no effect, like `even: false`, lowers to
`{ op: "pass" }`.

This keyword applies a schema only to strings:

```typescript
const ifStringKeyword = {
  uri: "https://example.com/keyword/ifString",
  shape: "schema",
  lower: (schema) => ({
    op: "typeSwitch",
    cases: { string: schema },
    otherwise: { op: "pass" }
  })
} satisfies Keyword;
```

The kernel has these operations:

| For | Operations |
| --- | --- |
| Types | `typeIs` |
| Values | `equals`, `oneOfValues` |
| Numbers | `range`, `multipleOf` |
| Strings | `stringLength`, `matches`, `format` |
| Arrays | `itemCount`, `item`, `eachItem`, `contains`, `uniqueItems` |
| Objects | `propertyCount`, `hasProperty`, `property`, `eachProperty`, `eachPropertyName` |
| Combining expressions | `all`, `any`, `one`, `not`, `cases`, `typeSwitch` |
| Annotations | `annotate` |

They're listed in the `Expression` type in
[`src/kernel/kernel.d.ts`](https://github.com/hyperjump-io/json-schema/blob/v2/src/kernel/kernel.d.ts).
The built-in keywords in
[`src/keywords/`](https://github.com/hyperjump-io/json-schema/tree/v2/src/keywords)
have examples of each.

### `siblings`

Some keywords depend on another keyword in the same schema. For example,
`additionalProperties` depends on `properties`. Such a keyword declares the
other one in `siblings` under a name of its choosing. `lower` and `check`
get the sibling's value by that name, parsed according to its shape. If the
sibling isn't there, they get `undefined`. `Keyword`'s third type parameter
gives the siblings' types. A map of schemas, like `properties`, comes as
its pairs in order.

```typescript
import type { Expression, Keyword } from "@hyperjump/json-schema";

const otherPropertiesKeyword = {
  uri: "https://example.com/keyword/otherProperties",
  shape: "schema",
  siblings: { properties: "https://json-schema.org/keyword/properties" },
  lower: (schema, { properties = [] }) => ({
    op: "eachProperty",
    select: {
      except: { names: properties.map(([name]) => name), patterns: [] }
    },
    of: schema
  })
} satisfies Keyword<Expression, "schema", {
  properties?: [string, Expression][];
}>;
```

Declaring siblings also tells lint rules that move keywords between
schemas what can't be separated. One such rule is
[`mergeable-schemas`](../linting/rules/mergeable-schemas.md).

## When the kernel can't say it

If a keyword checks something the kernel has no operation for, it lowers to
a `predicate`. Then it evaluates values in `evaluate`. A predicate only
applies to the `types` it lists. Values of other types pass.

```typescript
const isPrime = (n: number) => {
  if (n < 2) {
    return false;
  }
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      return false;
    }
  }
  return true;
};

const primeKeyword = {
  uri: "https://example.com/keyword/prime",
  shape: "data",
  lower: (prime) => prime
    ? {
      op: "predicate",
      keyword: "https://example.com/keyword/prime",
      value: true,
      types: ["integer"]
    }
    : { op: "pass" },
  evaluate: (_value, { instance }) => (node) => {
    const value = instance.value(node);
    return typeof value === "number" && isPrime(value);
  }
} satisfies Keyword<boolean>;
```

`evaluate` is called once with the predicate's `value`. It returns the
function that evaluates each instance. Read the instance with
`context.instance`. The instance can be a JavaScript value or an AST node,
depending on how it's validated. For a JavaScript value, `instance.value`
returns the instance itself, not a copy. That's why its type is readonly: a
`ReadonlyJson`. Check its type before using it, even for a predicate that
only applies to integers.

If a keyword applies schemas in a way the kernel can't express, it lowers
to an `opaque` operation instead. It gets evaluators for its schemas.
Prefer the kernel's operations wherever you can. Tools can see inside
them, but they can't see inside a predicate or an opaque operation.

## Schemas that use it

A `JsonSchema` with your dialect checks schemas passed to it as values. It
uses your keyword's type. See
[Schema types](../guides/schema-types.md#custom-keywords). To name the
type, pass your keywords to the dialect's type. Use the names they have in
the dialect:

```typescript
import type { V1Schema } from "@hyperjump/json-schema/v1";

type MySchema = V1Schema<{ even: typeof evenKeyword }>;

const schema = { type: "integer", even: 2 } satisfies MySchema;
```

```text
Type 'number' is not assignable to type 'boolean | undefined'.
```

A keyword declared with a type annotation, like
`const evenKeyword: Keyword`, loses its shape. It can then have any value
at all.
