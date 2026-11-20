# Generating code, and building lazily

First recorded 2026-11-20, on Node.js 26.3.1 (in-process) and 26.13.1
(`jsonschema-benchmark`). Neither was kept, and the code wasn't committed.

## What was tried

- **Generated evaluators.** The optimized kernel as JS source, one function
  per schema, made with `new Function`. Operations are inlined as
  expressions, small schemas without loops are inlined into the schema
  that applies them, and property operations are one loop with a `switch`
  on the name. One version is for FLAG, and one is for plugins and
  annotating, with the same hook calls, written out for each keyword group.
  What it didn't generate (schemas that read marks, a dynamic scope,
  `opaque`, `predicate`, `itemSequence`) was evaluated by the closures.
  Either version could be generated all at once or a schema at a time on
  its first call.
- **Lazy closures.** The closures, with each schema's built on its first
  call. A stub that builds it stays between callers and the schema, unless
  it's replaced: when the schema is built, its evaluator is written over
  the stub wherever one is held. That's the property loops' entries,
  `all`, `any`, `one`, `not`, and `cases`, the switches, the item loops, and
  the schema's groups.

Both gave the same results as the closures, with 0 differences from
`ab-equal.ts` on the default corpora and `jsonschema-benchmark`'s 36
schemas. They also made the same hook calls, compared one by one with
their locations, results, states, and annotations, on plain values, JSON
text (with a value that couldn't be parsed), and annotated ASTs.

## In-process

Warm, generated code against the closures (B/A from `ab.ts`):

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| FLAG | 0.68 | 0.57 | 0.50 |
| A plugin with every hook | 0.45 | 0.42 | 0.39 |
| An AST with every hook | 0.57 | 0.44 | 0.36 |
| Every hook reads `instanceLocation` | 0.71 | 0.71 | 0.64 |
| BASIC | 0.69 | 0.65 | 0.51 |
| Annotating | 0.77 | 0.52 | 0.50 |

On `jsonschema-benchmark`'s schemas, FLAG was 0.32–0.86 except `cql2`,
which was 1.27. That wasn't looked into. `openapi` generated nothing,
because its root schema reads marks.

The source was large: 700 kilobytes for FLAG and 2.3 megabytes with plugins on
`package.json`, which has 3,605 schemas. The instances reach few of them.
Its 3,000 instances reach 228 schemas, and one instance reaches 1–5 percent.

Cold, from `validatorFor` through validating the first instance, 100, and
1,000, in fresh processes (milliseconds, the median of 7):

| A plugin with every hook | Closures | Lazy closures | Generated | Generated lazily |
| --- | --- | --- | --- | --- |
| `package.json` | 47.6 / 50.7 / 70.2 | 23.0 / 27.2 / 45.5 | 96.7 / 101.6 / 125.3 | 24.4 / 33.5 / 61.9 |
| `ui5-manifest` | 30.9 / 36.7 / 61.1 | 18.7 / 28.6 / 52.0 | 56.8 / 74.9 / 120.9 | 19.9 / 51.7 / 101.2 |
| `clang-format` | 8.1 / 9.6 / 12.3 | 6.4 / 9.7 / 12.6 | 11.6 / 17.4 / 22.8 | 7.2 / 20.8 / 26.8 |

Generated code was slower than the closures for at least 1,000 instances,
even when it's generated lazily. Each generated function is its own code,
which V8 runs in its interpreter and optimizes on its own, while every
schema's closures share code that's already optimized.

Lazy closures were warm within noise of the closures (0.98–1.04) once the
stubs were replaced. Without replacing them, they were up to 1.17 on FLAG,
because every call to a schema went through one. Building again, at calls
2, 4, 8, … with the schemas reached so far built directly, was as fast warm,
but each new build made its first instances slower than the stubs did, and
it made new `KeywordInfo`s, which plugins can expect to stay the same.

## `jsonschema-benchmark`

57 schemas, plain and with an empty plugin, the median of 3 runs each.
These are geometric means of each schema's ratio to the closures, with the
range. First use is `compile` and `cold` together, because building lazily
moves time from one to the other.

| | First use | Warm | With a plugin, first use | With a plugin, warm |
| --- | --- | --- | --- | --- |
| Lazy closures | 1.00 (0.82–1.14) | 1.02 (0.89–1.09) | 1.00 (0.86–1.24) | 1.01 (0.92–1.13) |
| Generated | 1.11 (0.86–1.49) | 0.68 (0.31–1.37) | 1.11 (0.39–1.72) | 0.40 (0.16–1.00) |
| Generated lazily | 1.14 (0.95–1.63) | 0.71 (0.37–1.76) | 1.16 (0.39–2.00) | 0.40 (0.14–1.00) |

Building is about a tenth of `compile`, which is mostly compiling the
schema. The lazy closures made `compile` 0.87–0.91. The cold pass is a
median of 500 instances, which reach most of what's reached at all, so the
building moved into it. In-process, `compile` wasn't counted, so the share
saved looked larger.

Generated code made `compile` 1.09–1.13 times as long and the cold pass
1.24–1.27. The second is V8 optimizing each function on its own, which
generating the code ahead of time, as modules, wouldn't change.

## Decided

Neither is used. Generated code is faster for many instances, up to 0.16
with a plugin, but slower to start, and `new Function` isn't allowed by a
content security policy that leaves out `unsafe-eval`. Lazy closures are
faster for one instance of a large schema, but not for a corpus, and they
add a stub or a holder to replace for every place a schema is held.
