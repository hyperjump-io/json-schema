# Bytecode and closures

First recorded 2026-10-18.

A prototype in `benchmark/` (`claude/bytecode.ts`) lowers the IR once and then
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

`bytecode.bench.ts` and `bytecode-polymorphic.bench.ts` (in `claude/`) use the
test suite. `corpus.bench.ts` uses real schemas: SchemaStore's `package.json` schema
with 3000 `package.json` files and its `tsconfig.json` schema with 196
`tsconfig.json` files (from `~/Projects`), the OpenAPI 3.0 schema with its
examples, and the draft-07 and draft-04 meta-schemas with every schema in
the test suite. `data/build-corpus.mjs` builds the corpora, which have
changed a little since. Every variant agrees
with v2 on every instance.

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
