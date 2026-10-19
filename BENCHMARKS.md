# Benchmarks

Measurements behind the performance decisions in [DESIGN.md](DESIGN.md).
The benchmark code is in `scratch/bench`, which isn't committed.

The benchmark is ported from `@hyperjump/json-schema`'s and isn't committed.
It compares implementations over the v1 test cases of the
JSON-Schema-Test-Suite, and over the draft-04, draft-06, draft-07, 2019-09,
and 2020-12 test cases, which json-schema-next evaluates with those presets.
ata-validator doesn't support draft-04, so it isn't in that comparison. Test
cases tagged for `format` are left out. A test case that any implementation
gets wrong is left out for every implementation. In those drafts,
json-schema-next only gets the two `file:` identifier test cases wrong, which
it rejects on purpose. In draft-04 through draft-07, `@hyperjump/json-schema`
also gets two legacy identifier test cases wrong. json-schema-next and
`@hyperjump/json-schema` both validate draft-04 through draft-07 formats by
default. That doesn't matter, because the untagged test cases that are run
only use `format` on values that aren't strings, which `format` skips. The
unknown format test case is the exception, and it's left out because
`@exodus/schemasafe` can't compile it.

Results (mean time per run of the suite, FLAG unless it says errors):

| | json-schema-next | `@hyperjump/json-schema` |
| --- | --- | --- |
| v1 | 0.27–0.28 ms | 0.74–0.79 ms |
| v1, after evaluating ASTs | 0.31–0.33 ms | 0.75 ms |
| v1, all errors | 1.58–1.64 ms | 1.36–1.39 ms |
| draft-04 | 0.08 ms | 0.21 ms |
| draft-04, all errors | 0.56–0.57 ms | 0.43–0.44 ms |
| draft-06 | 0.11 ms | 0.26 ms |
| draft-06, all errors | 0.74–0.76 ms | 0.56–0.57 ms |
| draft-07 | 0.12 ms | 0.29 ms |
| draft-07, all errors | 0.77–0.78 ms | 0.62–0.63 ms |
| 2019-09 | 0.29 ms | 0.76–0.79 ms |
| 2019-09, all errors | 1.64–1.80 ms | 1.43–1.47 ms |
| 2020-12 | 0.30 ms | 0.84–0.85 ms |
| 2020-12, all errors | 1.78–1.83 ms | 1.53–1.63 ms |

- FLAG is about 2.7–2.9 times faster than `@hyperjump/json-schema` in v1,
  about 2.5 times faster in draft-04, about 2.4 times faster in draft-06 and
  draft-07, about 2.7 times faster in 2019-09, and about 2.85 times faster in
  2020-12.
- `validate` is about 15% slower in a process that has also evaluated
  ASTs, because keyword code is shared (see "Compile and evaluate" in DESIGN.md).
- Collecting errors (BASIC) is about 1.16–1.18 times slower than
  `@hyperjump/json-schema` in v1, about 1.29–1.31 times slower in draft-04,
  about 1.30–1.36 times slower in draft-06, about 1.24 times slower in
  draft-07, about 1.15–1.22 times slower in 2019-09, and about 1.12–1.16 times
  slower in 2020-12. It was about 5 times slower until errors stopped
  capturing stack traces (see "Validation API" in DESIGN.md).
- Measurements drift by several percent between sessions. The v1 errors
  row was first measured at 1.52–1.54 ms (about 1.13 times slower). Run
  side by side later, the code from then and the current code both took
  1.60–1.66 ms, so it wasn't a regression. The "after evaluating ASTs" row
  is from the first session.
- `@exodus/schemasafe`, which generates code, is the fastest at collecting
  errors. It's about 14 times faster than json-schema-next in draft-04, about
  10 times faster in draft-06 and draft-07, about 6.8–7.3 times faster in
  2019-09, and about 4.6–4.7 times faster in 2020-12.
- With the `format` test cases, format validators take most of the time,
  and FLAG is only about 1.4 times faster.

## Modes

The same benchmark (`json-schema.bench.ts`) times every mode of a
`Validator` against the others, without other implementations. It runs on
the v1 test cases json-schema-next gets right. Each instance is a JS value,
its JSON text, or a JSON AST built from it with browser's `fromJs` before
the timed part. Annotating a node adds to the annotations already on it, so
`annotateNode` gets new nodes before each run, which isn't timed. Error modes
go through every error.

Results (mean time per run of the suite):

| Mode | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| FLAG | 0.23 ms | 2.26 ms | 0.46 ms |
| BASIC | 1.70 ms | 4.07 ms | 2.08 ms |
| DETAILED | 1.98 ms | 4.38 ms | 2.39 ms |
| Annotations | 0.99 ms | 2.45 ms | 0.84 ms |

- Parsing JSON text costs more than evaluating in every mode. FLAG on text
  is about 10 times slower than on a value, and about 2 ms of every text
  row is parsing.
- FLAG on an AST is about 2 times slower than on a value. An AST is
  evaluated by its own specialization, which reads values through the nodes
  (see "Compile and evaluate" in DESIGN.md).
- DETAILED is about 1.08–1.16 times slower than BASIC.
- Annotations are faster than BASIC, which creates an error object for each
  failure. `annotateNode` is faster than `annotate`, which builds the AST
  from the value itself.
- 2020-12 gives results within a few percent of v1. The suite's test cases
  mostly don't have `$schema`, so both run nearly the same test cases with
  mostly the same keywords.

## Bytecode and closures

A prototype in `scratch/bench` (`bytecode.ts`) lowers the IR once and then
turns it into either bytecode (one `Int32Array` run by an interpreter loop)
or closures with the same logic. Both only evaluate plain values in FLAG.
The lowered keywords are `type`, `const`, `enum`, `required`, the numeric,
length, and size bounds, `pattern`, `uniqueItems`, `properties`,
`patternProperties`, `additionalProperties`, `prefixItems`, `items`,
draft-04's `items` and `additionalItems`, `$ref`, `allOf`, `anyOf`, `oneOf`,
and `not`. Any other keyword is a call to its own evaluator. Schemas with a
keyword that reads evaluation state (`unevaluated*`, `$dynamicRef`) aren't
supported. It's compared with `Validator.validate` and with the
specialization for plain values called directly.

`bytecode.bench.ts` and `bytecode-polymorphic.bench.ts` use the test suite.
`corpus.bench.ts` uses real schemas: SchemaStore's `package.json` schema
with 3000 `package.json` files and its `tsconfig.json` schema with 196
`tsconfig.json` files (from `~/Projects`), the OpenAPI 3.0 schema with its
examples, and the draft-07 and draft-04 meta-schemas with every schema in
the test suite. `build-corpus.mjs` builds the corpora. Every variant agrees
with json-schema-next on every instance.

Real schemas (mean time per run of the corpus, FLAG):

| | `validate` | specialization | closures | bytecode | closures, no-ops dropped |
| --- | --- | --- | --- | --- | --- |
| `package.json` | 17.9 ms | 17.9 ms | 13.4 ms | 13.9 ms | 12.7 ms |
| `tsconfig.json` | 0.78 ms | 0.74 ms | 0.41 ms | 0.45 ms | 0.36 ms |
| OpenAPI 3.0 | 0.159 ms | 0.157 ms | 0.106 ms | 0.101 ms | 0.104 ms |
| draft-07 meta-schema | 0.137 ms | 0.126 ms | 0.100 ms | 0.103 ms | 0.088 ms |
| draft-04 meta-schema | 0.100 ms | 0.095 ms | 0.065 ms | 0.069 ms | 0.057 ms |

- Bytecode and closures are within about 10% of each other, and neither
  wins consistently. Closures were faster on four of the five corpora and
  on the test suite when every keyword was lowered. Bytecode was slightly
  faster when some keywords were calls, probably because it finds the
  instance's type once per schema, which closures could do too. Specialize
  keeps producing closures.
- Closures written for plain values were 1.25–1.8 times faster than the
  specialization, and about 1.65 times faster on the test suite (1.86
  times after evaluating ASTs).
- `Validator.validate` adds 15–20% on the test suite, whose instances are
  tiny, and 0–9% on real schemas.

Profiling the specialization on the real schemas found where the gap was.
`enum` compared every value with `instanceEqual`, `type` looked up a `Set`,
and the fastest schema evaluator checked for an AST on every call. `enum`
now looks up primitives in a `Set` and only compares arrays and objects,
`type` compares a single type directly, and plain values have their own
fastest schema evaluator, which is the keyword itself for a schema with
one keyword. The specialization compared with the closures:

| | Before | After |
| --- | --- | --- |
| `package.json` | 1.24× | 1.16× |
| `tsconfig.json` | 1.84× | 0.95× |
| OpenAPI 3.0 | 1.56× | 1.23× |
| draft-07 meta-schema | 1.29× | 1.06× |
| draft-04 meta-schema | 1.46× | 1.15× |
| v1 suite, every keyword lowered | 1.65× | 1.18× |
| v1 suite, after evaluating ASTs | 1.86× | 1.43× |

- Iterating an object's properties (`properties`, `additionalProperties`,
  `patternProperties`) is most of what's left in `package.json` and
  OpenAPI 3.0. For plain values, `properties` could look up its own names
  instead, but that's a linear search for each name in an AST, where it
  also behaves differently for duplicate names. Only a separate evaluator
  for plain values can do both.
- A generator for `jsInstance.entries` was 10–18% faster than
  `Object.entries` in a standalone script but 35–45% slower on
  `package.json` in the benchmark, so it isn't used.
- Results drift between sessions by more than some of these differences,
  so changes are compared by running the old and new code back to back.
- Most calls in real schemas are to keywords that always pass in FLAG
  (`description`, `default`, `title`, unknown keywords). Dropping them saves
  5–15%. The prototype lists them by hand.
