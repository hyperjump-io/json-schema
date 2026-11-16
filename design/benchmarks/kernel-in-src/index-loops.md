# Index loops instead of iterators

First recorded 2026-11-16.

pact found hand-written iterator classes about 2.2 times as fast as
generators, and a `for` loop faster than both. The instrumented evaluator
still iterated in four places: `eachItem`, `contains`, and `itemSequence`
with `for...of` over `ops.items`, and `eachPropertyName` over
`ops.keys`, which was a generator for an AST. Each `for...of` call site
sees the iterators of both `InstanceOps`. `astInstance.keys` returns an
array now, like `entries`, and the four loops read the array by index.
`InstanceOps` still says they return an `Iterable`, so a keyword doesn't
depend on it.

`ab.ts` for each `METHOD`, B/A, against HEAD, 11 rounds of 100 milliseconds, on Node 26.3.1. Corpora
are `jsonschema-benchmark`'s schemas without formats and their instances
(all but `krakend`), and the usual ones. A/A is both copies at HEAD, 21
rounds, for how much of a difference is the harness's position bias:

| | B/A | A/A |
| --- | --- | --- |
| `hooks`, `geojson` | 0.845 | 0.991 |
| `hooks`, `cspell` | 0.895 | 0.985 |
| `hooks`, `helm-chart-lock` | 0.954 | 1.019 |
| `hooks`, others | 0.94–1.01 | |
| `basic`, `geojson` | 0.954 | 0.947 |
| `flag`, `geojson` | 0.960 | 0.963 |
| `flag`, `basic`, `node`, others | 0.97–1.03 | |

- With `hooks`, every item goes through the general `eachItem` loop, because
  a plugin rules out checking a typed array's items in one evaluator. That's
  where the time was saved. `geojson` and `cspell` are mostly arrays.
- `flag` doesn't run `instrumented.js`, so its 0.960 on `geojson` is bias,
  as the A/A run shows. `basic`'s differences are the same as A/A's.
- `annotate` and `annotateNode` varied by up to 0.5 between the first and
  third quartiles, so they say nothing either way. `node` on `cql2` was 1.069, and 1.003 with 21
  rounds.
- `ab-equal.ts` found no differences on any corpus.
