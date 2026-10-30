# Custom keywords

A keyword is a plain object with a URI. Give it a name in a dialect with
`extendDialect`, which returns a new dialect, and put that in the config
instead of the dialect.

```typescript
import { JsonSchema, extendDialect } from "@hyperjump/json-schema";
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
};

const jsonSchema = new JsonSchema({
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

To replace a keyword a dialect has, put a definition with the same URI in
the `keywords` config. It's used in every dialect that has the keyword.

```typescript
const jsonSchema = new JsonSchema({ dialects: [v1Dialect], keywords: [myTypeKeyword] });
```

## The parts of a keyword

| Property | What it's for |
| --- | --- |
| `uri` | What identifies the keyword, in every dialect |
| `shape` | Where the keyword's value has schemas in it |
| `check` | Reports problems with the value, like `even: "yes"` |
| `lower` | What the keyword means, as a kernel expression |
| `siblings` | Other keywords in the same schema it reads |
| `evaluate` | Evaluates values itself, for what the kernel can't express |

### `shape`

The shape says which parts of the value are schemas, so they're resolved
and compiled, and so tools that walk schemas, like lint rules and bundling,
find them without knowing your keyword.

| Shape | The value is |
| --- | --- |
| `"data"` | Plain JSON, like `minimum`'s number |
| `"schema"` | A schema, like `not`'s |
| `"unappliedSchema"` | A schema the keyword doesn't apply, like `contentSchema`'s. It's resolved, but not compiled. |
| `"reference"` | A URI reference, like `$ref`'s |
| `{ array: shape }` | An array of that shape, like `allOf`'s array of schemas |
| `{ map: shape }` | An object whose values are that shape, like `properties` |
| `[shape, shape]` | Any of the shapes, like `items` in draft-07, a schema or an array of schemas |

A value that doesn't fit the shape is a problem with the schema, reported
before `check` is called.

### `check`

`check` reports problems the shape doesn't describe, like a negative
`minLength`. It's called while the schema is resolved, with the value as a
JSON AST node. `message` reports a problem, and the schema can't be
compiled. Without `check`, any value that fits the shape is allowed.

### `lower`

`lower` says what the keyword means, as an expression of the kernel. It
gets the value parsed by its shape: a schema is already compiled, as
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
};
```

The kernel has operations for types (`typeIs`), values (`equals`,
`oneOfValues`), numbers (`range`, `multipleOf`), strings (`stringLength`,
`matches`, `format`), arrays (`itemCount`, `item`, `eachItem`, `contains`,
`uniqueItems`), objects (`propertyCount`, `hasProperty`, `property`,
`eachProperty`, `eachPropertyName`), and combining expressions (`all`,
`any`, `one`, `not`, `cases`, `typeSwitch`), along with `annotate`. They're
listed in the `Expression` type, in
[`src/kernel/kernel.d.ts`](https://github.com/hyperjump-io/json-schema/blob/v2/src/kernel/kernel.d.ts). The built-in keywords in [`src/keywords/`](https://github.com/hyperjump-io/json-schema/tree/v2/src/keywords) are
examples of each.

### `siblings`

A keyword that depends on another keyword in the same schema, like
`additionalProperties` depends on `properties`, declares it in `siblings`
by a name of its choosing. `lower` and `check` get its value by that name,
or `undefined` if it isn't there.

```typescript
siblings: { properties: "https://json-schema.org/keyword/properties" },
lower: (schema, { properties = [] }) => ({
  op: "eachProperty",
  select: {
    except: { names: properties.map(([name]) => name), patterns: [] }
  },
  of: schema
})
```

Declaring them also tells lint rules that move keywords between schemas,
like [`mergeable-schemas`](../linting/rules/mergeable-schemas.md),
what can't be separated.

## When the kernel can't say it

A keyword that checks something the kernel has no operation for lowers to a
`predicate` and evaluates values in `evaluate`. A predicate only applies to
the `types` it lists. Values of other types pass.

```typescript
const isPrime = (n) => {
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
    return isPrime(instance.value(node));
  }
};
```

`evaluate` is called once, with the predicate's `value`, and returns the
function that evaluates each instance. Read the instance with
`context.instance`, because the instance can be a JavaScript value or an
AST node, depending on how it's validated. For a JavaScript value,
`instance.value` returns the instance itself, not a copy, so don't change
it. In TypeScript, it's readonly.

A keyword that applies schemas in a way the kernel can't express lowers to
an `opaque` operation instead, and gets evaluators for its schemas. Prefer
the kernel's operations wherever you can. Tools can see inside them, and
can't see inside a predicate or an opaque operation.

## In TypeScript

Declare a keyword with `satisfies Keyword`, giving the type of the value
`lower` gets. That keeps its `shape` as written, so the keyword's type
says what its value is in a schema, and schemas that use it can be checked
with your dialect's type (see
[Schemas in TypeScript](../guides/typescript.md#custom-keywords)):

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

const schema = { type: "integer", even: 2 } satisfies MySchema;
```

```text
Type 'number' is not assignable to type 'boolean | undefined'.
```

The type of the keyword's value comes from its shape. A schema in the value
has the type of the schema it's in, so it can use the dialect's other
keywords, including yours. Data is the type `lower` gets, readonly:
`boolean`, above.

| Shape | Like | In a schema |
| --- | --- | --- |
| `"data"` | `minLength` | What `lower` gets |
| `"schema"` | `not` | A schema |
| `"unappliedSchema"` | `contentSchema` | A schema |
| `"reference"` | `$ref` | A string |
| `{ array: "schema" }` | `allOf` | An array of schemas |
| `{ map: "schema" }` | `properties` | An object of schemas |
| `["schema", { array: "schema" }]` | `items` in 2019-09 | A schema or an array of schemas |
| `{ map: ["schema", { array: "data" }] }` | `dependencies` in draft-07 | An object of schemas or arrays of strings |

A keyword whose `lower` doesn't give its value a type can have any JSON
there. One declared with a type annotation (`const evenKeyword: Keyword`)
loses its shape, and can have any value at all.
