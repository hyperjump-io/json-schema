# One-case conditionals

First recorded 2026-11-10.

In `jsonschema-benchmark`, `ui5` is a draft-07 decision tree: 39 `if`,
`then`, and `else`, each testing one property's value (`specVersion`, then
`kind`, then `type`), nested through `else`. Each `else` that's an `if` is
a schema of its own, so every `cases` has one case. A profile of its warm
passes had 16–18% of the time in `cases`'s own evaluator, with V8's
inlining on or off. Its conditions are cheap, about six for each instance.
What cost was the evaluator: a loop over one case, destructuring it, and a
set for the condition's marks when nothing reads them.

`fast.js` now evaluates a `cases` of one case without the loop, and without
the set when nothing reads marks. `if.js`, the dependency keywords
(`whenProperty`), and v1's `conditional` of one condition lower to it.

`ab.ts` FLAG, B/A, against HEAD, on Node 22.22. Corpora are
`jsonschema-benchmark`'s 36 schemas with their instances (all but
`krakend`), and the usual ones, each corpus in a process of its own:

| | B/A | | B/A |
| --- | --- | --- | --- |
| `draft-04` | 0.825 | `ui5` | 0.949 |
| OpenAPI (`openapi`) | 0.983 | `ui5-manifest` | 1.024 |
| Others | 0.96–1.02 | | |

- `draft-04` is the draft-04 meta-schema validating 563 real draft-04
  schemas. Its `dependencies` lower to one-case `cases`, which every
  subschema of every instance evaluates, so it gained more than `ui5`.
- `geojson`, `cql2`, `cspell`, `omnisharp`, and `vercel` have no
  conditionals and were 0.957–1.023, which is how much changing `fast.js`
  moves a corpus it doesn't change. `ui5-manifest` was 1.03 against a copy
  of HEAD earlier the same day.
- `ab-equal.ts` with ten mutants for each instance found no differences on
  any corpus. The test suites caught each of six mistakes made on purpose
  (11 to 233 failing tests): `then` and `else` swapped, a missing `then` or
  `else` that fails, and the condition's marks, or the marks for `then` or
  `else`, left out.
