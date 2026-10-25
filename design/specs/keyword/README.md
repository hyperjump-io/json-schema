# Keywords (`src/keyword.d.ts`)

Keywords are plain, stateless objects so one definition can be shared by
every `JsonSchema` instance and every dialect. Anything instance-specific
should come through a context argument. (Classes with constructor injection
were considered. See [Open questions](#open-questions).)

```ts
type Keyword = {
  uri: string;
  shape: Shape;
  siblings?: Record<string, string>;   // local name to keyword URI
  check?: (valueNode, context) => void;
  resolve?: (valueNode, context) => void;
  lower?: (value: LowerInput, siblings: Record<string, LowerInput | undefined>, context: LowerContext) => Expression;
  evaluate?: <I>(value: Json, context: EvaluateContext<I>) => (instance: I) => boolean;  // for `predicate` and `opaque` only
};

type Shape = "schema" | "unappliedSchema" | "reference" | "data" | { array: Shape } | { map: Shape } | Shape[];
```

- `uri` identifies the keyword independent of its name in any dialect.
- [`shape`](shape.md) says where the value contains schemas and references.
- [`siblings`](siblings.md) declares the sibling keywords it reads.
- [`check`](check.md) reports what the shape can't say about the value.
- [`resolve`](resolve.md) identifies schemas and defines dialects.
- [`lower`](lower.md) says what the keyword means, as a kernel expression,
  and [`evaluate`](lower.md#escape-hatches) is for the escape hatches.
- [`$schema` and unknown keywords](schema-and-unknown.md) are part of every
  dialect.

Draft-specific identifier rules live in keyword definitions, not the core.

## Before the kernel

A keyword had `compile`, which returned an opaque JSON value, and
`evaluate`, a closure, so everything that needed to know what a keyword
means had a table of keyword URIs: the optimization passes, lint's
`keywordType` and list of assertions, and the output formats' `if` and
`conditional`. Removed with the kernel: `compile`, `simpleApplicator` (the
operations say), `reads` (except on `opaque`), the keywords'
`siblingKeyword`, `compileSchemaArray`, and `compileSchemaMap` utilities,
and `siblings.test.js`.

## Open questions

- **Where keywords get their dependencies.** From a context argument
  (stateless, shareable keywords; current lean, and what `CompileContext`
  does) or constructor injection (matches browser's plugins).
