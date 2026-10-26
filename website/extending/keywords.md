# Custom keywords

A keyword is a plain object with a URI. Add it with `addKeyword`, then give
it a name in a dialect with `extendDialect`.

```javascript
import { v1DialectUri } from "@hyperjump/json-schema/v1";

jsonSchema.addKeyword({
  uri: "https://example.com/keyword/even",
  shape: "data",
  check(valueNode, { message }) {
    if (valueNode.jsonType !== "boolean") {
      message("Expected a boolean");
    }
  },
  lower: (even) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
});

jsonSchema.extendDialect(v1DialectUri, {
  keywords: { even: "https://example.com/keyword/even" }
});
```

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "integer",
  "even": true
}
```

Add keywords before compiling schemas that use them. Schemas that were
already resolved don't see them.

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

```javascript
jsonSchema.addKeyword({
  uri: "https://example.com/keyword/ifString",
  shape: "schema",
  lower: (schema) => ({
    op: "typeSwitch",
    cases: { string: schema },
    otherwise: { op: "pass" }
  })
});
```

The kernel has operations for types (`typeIs`), values (`equals`,
`oneOfValues`), numbers (`range`, `multipleOf`), strings (`stringLength`,
`matches`, `format`), arrays (`itemCount`, `item`, `eachItem`, `contains`,
`uniqueItems`), objects (`propertyCount`, `hasProperty`, `property`,
`eachProperty`, `eachPropertyName`), and combining expressions (`all`,
`any`, `one`, `not`, `cases`, `typeSwitch`), along with `annotate`. They're
listed in the [`Expression`](https://hyperjump.io/json-schema/api/type-aliases/expression/)
type. The built-in keywords in [`src/keywords/`](https://github.com/hyperjump-io/json-schema/tree/v2/src/keywords) are
examples of each.

### `siblings`

A keyword that depends on another keyword in the same schema, like
`additionalProperties` depends on `properties`, declares it in `siblings`
by a name of its choosing. `lower` and `check` get its value by that name,
or `undefined` if it isn't there.

```javascript
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
like [`mergeable-all-of-schema`](../linting/rules/mergeable-all-of-schema.md),
what can't be separated.

## When the kernel can't say it

A keyword that checks something the kernel has no operation for lowers to a
`predicate` and evaluates values in `evaluate`. A predicate only applies to
the `types` it lists. Values of other types pass.

```javascript
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

jsonSchema.addKeyword({
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
});
```

`evaluate` is called once, with the predicate's `value`, and returns the
function that evaluates each instance. Read the instance with
`context.instance`, because the instance can be a JavaScript value or an
AST node, depending on how it's validated.

A keyword that applies schemas in a way the kernel can't express lowers to
an `opaque` operation instead, and gets evaluators for its schemas. Prefer
the kernel's operations wherever you can. Tools can see inside them, and
can't see inside a predicate or an opaque operation.
