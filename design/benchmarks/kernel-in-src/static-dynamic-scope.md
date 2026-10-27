# Resolving the dynamic scope

First recorded 2026-10-26.

None of the corpora use dynamic references, so these are corpora made for
it: the official 2020-12 and 2019-09 meta-schemas (from the json-schema-org
website repository), and "strict" dialects that extend them with
`$dynamicAnchor: "meta"` (`$recursiveAnchor: true`), a `$ref` to the
meta-schema, and `unevaluatedProperties: false`. The instances are the 596
schemas of the test suite and SchemaStore's 12 schemas. The corpora are
built by a one-off script that isn't committed.

[`static-dynamic-scope`](../../components/kernel/optimizations/static-dynamic-scope.md)
resolved every `dynamicApply` (18 in 2020-12, 19 in 2019-09) with no
copies. `ab.ts`, B/A, against HEAD:

| | FLAG | `validateJson` |
| --- | --- | --- |
| 2020-12 meta-schema, test suite schemas | 0.598 | 0.954 |
| 2020-12 meta-schema, SchemaStore | 0.611 | 0.955 |
| 2019-09 meta-schema, SchemaStore | 0.570 | 0.964 |
| strict 2020-12, SchemaStore | 0.627 | 0.955 |
| strict 2019-09, SchemaStore | 0.581 | 0.951 |

- With every `dynamicApply` resolved but the evaluator tracking the
  dynamic scope anyway, FLAG was 0.915–0.972. Most of it is not
  wrapping every schema to update the anchors in scope when evaluation
  enters a resource. Every meta-schema resource defines `"meta"`, so
  that wrapper can't be left out for resources without anchors.
- `validateJson` is mostly parsing.
- `static-unevaluated` already resolved the strict dialects'
  `unevaluatedProperties` before: their `$dynamicRef`s are on properties
  and items, so their marks are a child's.
- The pass takes about 0.12 ms on the meta-schemas' kernels (`optimize`
  went from 45–50 µs to 157–168 µs), once per evaluator.
- On 12,880 mutants (`ab-equal.ts`, `MUTANTS=20`), results were the same,
  and so were the BASIC errors. `check-src.ts` reported the same as HEAD.
  `package.json`, `tsconfig.json`, and OpenAPI 3.0 don't read the dynamic
  scope, and were 0.999–1.009.
