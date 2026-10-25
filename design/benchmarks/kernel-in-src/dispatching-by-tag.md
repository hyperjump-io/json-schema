# Dispatching by tag

First recorded 2026-10-24.

tree-sitter's grammar schema has a `oneOf` of 14 rule types, each with a
`const` for `type`, and most rules contain rules, so evaluating every
schema of the `oneOf` (with plugins, or `validateJson`, which evaluates an
AST) is exponential in a grammar's depth. `dispatch` evaluates only the
schema for the tag. Its corpus is 10 grammars from tree-sitter's
repositories, and GeoJSON, CQL2, and cmake-presets from
`jsonschema-benchmark` (100, 109, and 967 instances). `time-corpora.ts`,
before and after (separate runs, so differences under 10–15% are drift):

| | FLAG | Hooks that do nothing | BASIC | `validateJson` |
| --- | --- | --- | --- | --- |
| tree-sitter | 9.7 → 5.3 ms | 18.5 s → 8.4 ms | 2.9 s → 6.7 ms | 22 s → 42 ms |
| CQL2 | 0.42 → 0.28 ms | 159 → 2.5 ms | 0.45 → 0.28 ms | 119 → 3.1 ms |
| GeoJSON | 3.7 → 3.2 ms | 38 → 14 ms | – | 121 → 106 ms |
| cmake-presets | – | 261 → 237 ms | – | 328 → 285 ms |

`fast.js` then looked a `cases` of `propertyEquals` up by the property's
value, `ab.ts` FLAG, B/A, against the pass without it:

| | tree-sitter | GeoJSON | CQL2 | cmake-presets |
| --- | --- | --- | --- | --- |
| Keyed by a string of the type and value | 0.954 | 1.078 | 0.935 | 1.026 |
| Keyed by the value (a `Map` compares scalars as JSON does) | 0.481 | 0.890 | 0.731 | 0.997 |

Then the lookups became operations, `typeSwitch` and `propertySwitch`, so
every evaluator gets them without recognizing a `cases`. `ab.ts`, B/A,
against `fast.js` recognizing them (`validateJson` includes parsing, so its
ranges are wide):

| | tree-sitter | GeoJSON | CQL2 | cmake-presets |
| --- | --- | --- | --- | --- |
| FLAG | 0.918 | 0.979 | 0.843 | 0.996 |
| Hooks that do nothing | 0.616 | 0.964 | 0.811 | 0.988 |
| `validateJson` | 0.890 (0.855–0.953) | 0.984 | 0.919 (0.819–0.949) | 0.996 |

On `package.json`, `tsconfig.json`, and OpenAPI 3.0, each on its own, FLAG,
hooks, and BASIC were 0.98–1.015. With `propertySwitch` passing a tag that
couldn't be parsed, 724 of the mutants below passed that hadn't, and one
CQL2 mutant failed that hadn't, a tagged `oneOf` inside another `oneOf`
that now had two passing schemas. With the expression as it was for that
tag (`unparsed`), all 33,226 mutants of both corpora had the same results
and the same BASIC errors as the `cases` the pass made before.

Dispatching by which property an object has became `keySwitch` too. None
of the corpora in [The kernel in `src/`](README.md) has a union like that, so its corpus is the 30
SchemaStore schemas that get one, with SchemaStore's test instances (455,
20 mutants each). Against the `cases` with `not(property(name, fail))`
conditions, all 8,600 mutants had the same results and BASIC errors, and
the corpora above stayed the same too. `ab.ts`, B/A, on the six with the
most instances, each on its own when it was close: FLAG 0.95–0.99, hooks
0.95–0.99, `validateJson` 0.98–1.00. Specmatic with hooks was 1.106 after
the other five in the same process and 0.975–0.983 on its own.

- Against HEAD, `ab.ts` FLAG on the usual corpora was 0.98–1.01, except
  OpenAPI 3.0 at 1.02–1.03 when it ran after `package.json` in the same
  process. On its own it was 0.993, and with tags turned off 1.001, so
  that's the JIT's feedback from the other corpora, not the pass, which
  only changes OpenAPI 3.0's `SecurityScheme` `oneOf`.
- With hooks, `package.json` and `tsconfig.json` got about 10% faster
  (0.904, 0.908), because dispatching by type now applies with plugins.
- On 23,620 mutants of the corpus's instances (a string swapped for
  another, like a tag, a property removed, a value replaced, and JSON text
  with a value that can't be parsed), results were the same as before, and
  every BASIC error was one reported before. Reporting only the schemas
  for the tag cut BASIC errors from 1,428,154 to 1,130 on the grammars and
  from 1,537,883 to 53,582 on CQL2.
- The pass takes 3.9 ms on `package.json`, 0.3 ms on `tsconfig.json`, and
  0.4 ms on OpenAPI 3.0, as it did by type alone.
