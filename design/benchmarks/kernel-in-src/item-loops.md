# Item loops

First recorded 2026-10-25.

In `jsonschema-benchmark`, v2 was slowest compared to the other
implementations on GeoJSON (7.7 times corvus, 4.2 times ata-validator).
The schema becomes `typeSwitch` and `propertySwitch` on `type`, so only
one geometry is evaluated, and its coordinates are only `eachItem`,
`itemCount`, and `typeIs`. The 500 instances (26 MB) are 1.67 million
numbers and 817 thousand arrays, with 50 thousand objects. A generic
recursive walk over them, validating nothing, took as long as v2 (30 ms),
and a hand-written validator took 5.1 ms. `eachItem`'s closure is shared
by every `eachItem`, so V8 can't inline the call to its item schema, and
each call cost about as much as the check it made (6.6 ns).

`fast.js` now checks the type in the loop when an item schema only checks
the type, with `typeof` and a literal for `number` and `string` and the
type mask otherwise, and merges a schema's `typeIs` of only `array`,
`itemCount`, and `eachItem` into one evaluator. Corpora are
`jsonschema-benchmark`'s 36 schemas with their instances (all but
krakend), and the usual ones. `ab.ts` FLAG, B/A, against HEAD, each corpus
in a process of its own:

| | B/A | | B/A |
| --- | --- | --- | --- |
| GeoJSON | 0.528 | cspell | 0.585 |
| semantic-release | 0.800 | aws-cdk | 0.845 |
| jasmine | 0.882 | lerna | 0.888 |
| draft-04 | 0.902 | babelrc | 0.919 |
| stale | 0.928 | code-climate | 0.929 |
| `package.json` | 0.964 | OpenAPI 3.0 | 0.975 |
| `tsconfig.json` | 1.007 | Others | 0.94–1.02 |

- Checking the type in the loop was most of it. On GeoJSON alone, 28.7 ms
  became 17.5, and merging the array groups alone made it 26.2.
- `typeof` with a literal was faster than the type mask: against the mask,
  0.877 on GeoJSON with `number`, and 0.825 on cspell and 0.919 on
  draft-04 with `string`. The others were 0.98–1.01.
- An `eachItem` whose item schema isn't only a type check first went
  through the same loop as the merged evaluator, which was a second call
  for each array: openapi 1.022 and unreal-engine-uproject 1.012. It has
  its own loop again, and they're 0.98–1.01.
- ansible-meta was 1.068 after the other corpora had run, and 0.975 twice
  on its own. openapi was 0.976–1.018 in four runs.
- GeoJSON is still about 3.5 times the hand-written validator. What's left
  is one call for each array, through the item schema's evaluator, and
  the merged evaluator's call to its loop.
