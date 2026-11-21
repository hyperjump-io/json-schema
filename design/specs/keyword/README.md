# Keywords (`src/keyword.d.ts`)

Keywords are plain, stateless objects so one definition can be shared by
every config and every dialect. What a hook needs comes to it as values in
its context argument (see [Dependencies](#dependencies)).

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
  Its type is a parameter of `Keyword`, so a literal shape and the type of
  `lower`'s value give the type of the keyword's value in a schema (see
  [Schema types](../../components/schema-types.md)).
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

## Dependencies

Each hook's context has the values that hook needs: `check` has the
dialect, the declared siblings, and `message`; `resolve` has the
vocabularies and the dialect URI; `lower` has the dialect and the keyword's
name; `evaluate` has the instance operations. A keyword that depends on the
config reads it from the dialect, like `format`, which looks its format up
in `dialect.formats` and puts the result in the operation it returns.

Rejected: classes with constructor injection, like browser's plugins. A
keyword would be an instance per config, so one definition couldn't be
shared by every config and dialect, and something would have to build and
keep the instances. Browser's plugins hold behavior (retrieval), and
keywords don't need any.
