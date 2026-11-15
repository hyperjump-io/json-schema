# Extending

You can add keywords, formats, dialects, output formats, and lint rules.
This page explains the ideas they share. The pages after it show how to
add each one.

## Everything has a URI

Keywords, formats, and dialects are identified by URI, not by name. A
dialect maps names to URIs. For example, in v1, `minimum` is
`https://json-schema.org/keyword/minimum`. The same keyword can have
different names in different dialects. Two dialects can also use the same
name for different keywords.

That's why a keyword is defined with its URI and then given a name in a
dialect. Dialects carry their keyword definitions. `extendDialect` makes a
new dialect with more definitions, and that dialect goes in the `dialects`
option of `jsonSchemaConfig`.

```typescript
const evenKeyword = { uri: "https://example.com/keyword/even", ... };

const config = jsonSchemaConfig({
  dialects: [extendDialect(v1Dialect, { keywords: { even: evenKeyword } })]
});
```

Use a domain you control in your URIs so they don't conflict with anyone
else's.

Errors and annotations also identify their keyword by URI, in `ruleId`.
Lint rules find keywords by URI too. That's why they work in every dialect
that has the keyword.

## Keywords say what they mean with the kernel

A keyword doesn't validate values itself. Instead, it lowers its value to
an expression in the kernel. The kernel is a small language of operations
like `{ op: "range", min: 0 }` and
`{ op: "property", name: "age", of: ... }`. Every built-in keyword works
this way.

That's what lets one keyword definition work with everything. That
includes validation, the output formats, annotations, the optimizer, and
bundling. It also includes lint rules that need to know what a keyword
means, like
[`keyword-without-effect`](../linting/rules/keyword-without-effect.md).

For things the kernel can't express, there are escape hatches. They let
your keyword evaluate values with its own code. See
[Custom keywords](keywords.md).

## The API

Every part of the API has TypeScript declarations. Your editor shows each
method and type as you use it.

- [Custom keywords](keywords.md)
- [Custom formats](formats.md)
- [Custom dialects](dialects.md)
- [Custom output formats](output-formats.md)
- [Lint rules](lint-rules.md)
- [Evaluation plugins](plugins.md): observing an evaluation
- [Sessions](sessions.md): browsing schemas, following references, and
  compiling several with the same documents
