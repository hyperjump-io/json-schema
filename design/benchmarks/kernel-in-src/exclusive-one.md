# An exclusive `one` as `any`

2026-11-24. A pass after `dispatch`, in `fast`, that made a `one` whose
expressions all exclude each other
([`excludes`](../../components/kernel/implies.md)) an `any`, which stops at
the first that passes instead of trying the rest. It isn't used.

After the `fast` optimizations, the 39 schemas of the benchmark corpora
have 516 `one`s left, and 211 of them are exclusive: 197 in `cql2`, 6 in
`geojson`, 5 in `ui5-manifest`, 2 in `package.json`, and 1 in OpenAPI 3.0.

FLAG `validate` with the pass, as a fraction of without it, next to the
same measurement with both copies at `HEAD` (A/A), 21 rounds of 150 ms:

| Corpus | A/A | With the pass |
| --- | --- | --- |
| `cql2` | 0.980 | 0.968 |
| `geojson` | 0.961 | 0.958 |
| `ui5-manifest` | 1.041 | 1.034 |
| `package.json` | 1.000 | 1.019 |
| OpenAPI 3.0 | 0.999 | 1.002 |

So about 1% on `cql2`, and nothing that can be told from the A/A
difference on the others. `ab-equal` found no differences with 20 mutants
of each instance.

What the pass cost when an evaluator is built, the median of 31 runs:

| Corpus | Schemas | The pass | All the passes | Schemas it changed |
| --- | --- | --- | --- | --- |
| `package.json` | 4,304 | 3.59 ms | 18.84 ms | 2 |
| OpenAPI 3.0 | 337 | 0.40 ms | 1.28 ms | 1 |
| `cql2` | 252 | 1.06 ms | 3.43 ms | 23 |
| `geojson` | 318 | 1.25 ms | 1.94 ms | 6 |
| `ui5-manifest` | 2,095 | 1.65 ms | 7.96 ms | 5 |

`dispatch` already leaves a `one` only the expressions that can pass the
instance's type or tag, which is usually one of them, so there's rarely a
second one to skip. On `cql2`, the pass would pay for itself after about
500 validations, and on the others never.
