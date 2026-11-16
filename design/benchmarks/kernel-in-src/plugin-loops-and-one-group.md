# Plugin loops and schemas of one group

First recorded 2026-11-16.

`jsonschema-benchmark` has an entry, `hyperjump-v2-instrumented`, that
validates with a plugin of no hooks (`plugins: [{}]`), which makes every
evaluation use `instrumented.js`. Its warm time was 6.9 times
`hyperjump-v2`'s (geometric mean of the per-schema ratio, 37 schemas).

How much of that can go, with every hook and every location, was measured
first, by taking costs out of a copy of `src/` (results that would be
wrong, only as bounds). `ab.ts`, `METHOD=hooks`, B/A against HEAD, on
Node 26.3.1:

| | `geojson` | `cql2` | `jasmine` | `stale` | others |
| --- | --- | --- | --- | --- | --- |
| No `Location` for a schema | 0.823 | 1.011 | 0.920 | 0.913 | 0.92–0.96 |
| No hook calls for a schema | 0.872 | 0.999 | 0.941 | 0.932 | 0.96–0.98 |
| Both, after the changes below | 0.728 | 0.872 | 0.823 | 0.855 | 0.71–0.87 |

Most of the gap to `fast.js` is what plugins need: every schema and group
is evaluated with its own hooks, nothing stops early, and the item and
type checks `fast.js` does in its loops can't be done. What could go:

- A plain object's properties were read with `ops.entries`
  (`Object.entries`) in the property loop and in the matcher of a schema's
  merged groups, which makes an array of entries for each object. They're
  read with `for...in` now, as in `fast.js`, with the value read first
  ([Reading a property's value first](property-values-first.md)). ASTs keep
  their loops. Calling a function for each property, so one body serves
  both, made `node` up to 16% slower (`stale` 1.164, `jasmine` 1.117,
  `cypress` 1.093), so the bodies are written out for each.
- Most schemas have one group, like an item schema that's only `type`. A
  schema of one group that doesn't read marks or the dynamic scope gets an
  evaluator without the loop over groups or a set for the schema's marks.
  The group's marks are the schema's.

`ab.ts` with both, B/A against HEAD, 9–11 rounds of 200 milliseconds, on
Node 26.3.1. An A/A run was within 0.96–1.03 on these corpora (`openapi`
1.03–1.20):

| | `hooks` | `nodeHooks` | `node` | `annotate` |
| --- | --- | --- | --- | --- |
| `cql2` | 0.834 | 0.892 | 0.968 | 0.814 |
| `clang-format` | 0.838 | 1.036 | 0.988 | 1.021 |
| `geojson` | 0.877 | 0.922 | 1.015 | 0.921 |
| `openapi` | 0.878 | 0.937 | 0.954 | 0.984 |
| `ansible-meta` | 0.908 | 0.954 | 0.954 | 0.998 |
| `jasmine` | 0.957 | 0.971 | 0.987 | 1.007 |
| `cypress` | 0.988 | 1.056 | 1.022 | 0.976 |
| `stale` | 0.997 | 1.037 | 1.029 | 1.045 |

`nodeHooks` and `annotate` were measured with the property loops written as
one function, before they were written out.

The benchmark runs Node 23.7.0, where the difference is larger. Its
`hyperjump-v2-instrumented` warm times, after over before, geometric mean
over the 37 schemas: 0.603 (cold 0.908). `cypress` and `stale` are 0.41,
`jasmine` and `jshintrc` 0.44, `omnisharp` 0.49, and the least changed
are `jsconfig` 0.76, `cql2` 0.77, `cspell` 0.81, `yamllint` 0.83, and
`geojson` 0.85. Its warm time is 4.2 times `hyperjump-v2`'s now. The
schemas that changed most are ones that Node 23 already handled badly in
property loops, so it's probably the loops. How much each change does on
Node 23 wasn't measured.

`ab-equal.ts` found no differences on the 37 corpora, with 3 mutants of
each instance.
