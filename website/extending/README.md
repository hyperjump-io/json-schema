# Extending

You can add keywords, formats, dialects, output formats, and lint rules.
This page explains the ideas they share. The pages after it show how to
add each one.

## Everything has a URI

Keywords, formats, and dialects are identified by URI, not by name. A
dialect maps names to URIs: in v1, `minimum` is
`https://json-schema.org/keyword/minimum`. The same keyword can have
different names in different dialects, and two dialects can use the same
name for different keywords.

So adding a keyword takes two steps: define it with its URI, then give it a
name in a dialect.

```typescript
jsonSchema.addKeyword({ uri: "https://example.com/keyword/even", ... });
jsonSchema.extendDialect(v1DialectUri, {
  keywords: { even: "https://example.com/keyword/even" }
});
```

Use a domain you control in your URIs, so they don't conflict with anyone
else's.

Errors and annotations say which keyword they're from by URI too
(`ruleId`), and lint rules find keywords by URI, so they work in every
dialect that has the keyword.

## Keywords say what they mean with the kernel

A keyword doesn't validate values itself. It lowers its value to an
expression in the kernel, a small language of operations like
`{ op: "range", min: 0 }` and `{ op: "property", name: "age", of: ... }`.
Every built-in keyword works this way.

That's what lets one keyword definition work with everything: validation,
the output formats, annotations, the optimizer, bundling, and lint rules
that need to know what a keyword means, like
[`keyword-without-effect`](../linting/rules/keyword-without-effect.md).

For what the kernel can't express, there are escape hatches, where your
keyword evaluates values with its own code. See
[Custom keywords](keywords.md).

## The API

Every part of the API has TypeScript declarations, so your editor shows
each method and type as you use it.

- [Custom keywords](keywords.md)
- [Custom formats](formats.md)
- [Custom dialects](dialects.md)
- [Custom output formats](output-formats.md)
- [Lint rules](lint-rules.md)
- [Evaluation plugins](plugins.md): observing an evaluation
- [Sessions](sessions.md): browsing schemas, and compiling several with the
  same documents
