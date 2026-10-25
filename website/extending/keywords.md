# Custom keywords

A keyword is a plain object identified by a URI. Add it with `addKeyword`, then
give it a name in a dialect. In v1, that's `extendDialect`.

```javascript
import { v1DialectUri } from "@hyperjump/json-schema/v1";

jsonSchema.addKeyword({
  uri: "https://example.com/keyword/even",
  shape: "data", // Where the keyword's value contains schemas
  check(valueNode, { message }) { // Reports problems with the keyword's value
    if (valueNode.jsonType !== "boolean") {
      message("Expected a boolean");
    }
  },
  // What the keyword means, as a kernel expression
  lower: (even) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
});

jsonSchema.extendDialect(v1DialectUri, {
  keywords: { even: "https://example.com/keyword/even" }
});
```

A keyword says what it means by lowering its value to an expression of the
kernel, a small language of operations every keyword lowers to (see
`src/kernel/kernel.d.ts` and [the kernel spec](../../design/specs/kernel/README.md)). Evaluation, the
optimizer, and the output formats only work with expressions, so a keyword
that lowers works with all of them. `lower` gets the value parsed by its
shape: a schema is `{ op: "apply", schema: handle }`, already compiled. A
keyword without an effect, like `even: false`, lowers to `pass`. See the
built-in keywords in `src/keywords/`.

A keyword that reads another keyword in the same schema, like
`additionalProperties` reads `properties`, declares it in `siblings` by a name
of its choosing, and `lower` and `check` get its value by that name.

```javascript
siblings: { properties: "https://json-schema.org/keyword/properties" },
lower: (schema, { properties = [] }) => ({ // Undefined if it isn't there
  op: "eachProperty",
  select: { except: { names: properties.map(([name]) => name), patterns: [] } },
  of: schema
})
```

Lint rules that move keywords between schemas use `siblings` to know what
can't be separated.
