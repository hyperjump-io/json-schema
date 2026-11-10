# Arrays of typed arrays

First recorded 2026-11-10.

After [Item loops](item-loops.md), GeoJSON was still v2's slowest corpus
in `jsonschema-benchmark` compared to the other JavaScript
implementations: 13.5 ms, against corvus-ts at 3.8 and jsu-js at 4.2. A
profile of its warm passes had most of the time in three evaluators: the
merged array evaluator (27.5%), the loop over items whose schema isn't
only a type check (21.2%), and the loop over numbers (14.0%). Its
coordinates are arrays of positions, which are arrays of two or more
numbers, so each of the 817 thousand positions was a call to the merged
evaluator and its call to the loop over the numbers. Blaze checks this
shape in one instruction (`LoopItemsArrayBoundedTypeStrictAny`), and
jsu-js generates nested loops with no call for each item.

`fast.js` now checks, in the loop over the items, an item schema that
only checks that the item is an array of a size with items of a type,
with `typeof` and a literal for `number` and the type mask otherwise. An
`eachItem` on its own, without `typeIs` or `itemCount` beside it, uses
the same loop for it.

`ab.ts` FLAG, B/A, against HEAD, on Node 22.22. Corpora are
`jsonschema-benchmark`'s 36 schemas with their instances (all but
`krakend`), and the usual ones, each corpus in a process of its own:

| | B/A | | B/A |
| --- | --- | --- | --- |
| GeoJSON | 0.513 | `cql2` | 0.990 |
| `cspell` | 0.996 | `package.json` | 1.008 |
| `tsconfig.json` | 1.006 | OpenAPI 3.0 | 1.008 |
| Others | 0.97–1.02 | `ui5-manifest` | 1.009–1.036 |

- GeoJSON went from 16.2 ms to 8.3. In `jsonschema-benchmark`'s
  container (Node 23.7), its warm time went from 13.5–15.0 ms to 6.8–7.0
  in five alternating pairs.
- Only GeoJSON, `cql2`, and `cspell` have an item schema of this
  shape. `cql2`'s and `cspell`'s instances rarely reach it.
- `ui5-manifest` doesn't use the new loop. A copy of HEAD against itself
  was 1.028–1.033 on it in three runs, so its B/A is the harness, not the
  change.
- `ab-equal.ts` with ten mutants for each instance found no differences on
  any corpus.
- What's left on GeoJSON is one call for each ring of positions and each
  polygon, through the merged evaluator, and the property loop and tag
  dispatch on each object. jsu-js inlines every level and reads named
  properties directly.
