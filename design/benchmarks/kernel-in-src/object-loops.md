# Object loops

First recorded 2026-10-26.

After [Unique items](unique-items.md), v2 was slowest compared to the
other implementations in `jsonschema-benchmark` on SchemaStore's Helm
`Chart.lock` schema (3.8 times ata-validator, 4.4 times corvus). Its
schemas are only `type: object`, `properties`, `required`, and
`additionalProperties: false`, on about 11,800 objects (116 ns each, where
ata-validator takes about 30). Each object was a call for `typeIs`, one
for each `hasProperty`, and one for the property loop, which went through
the loops for patterns and `except`s for every property, and called the
`false` schema for a name it didn't know. The dependency objects have four
orders of their names, so they have several hidden classes.

On that corpus alone (ms for each run of it):

| | ms |
| --- | --- |
| Before | 1.37 |
| The schema's `hasProperty`s and `typeIs` in the loop, `additionalProperties: false` failing without a call | 0.96 |
| And a property schema that only checks the type checked in the loop | 0.71–0.80 |
| And one lookup for each name, in entries of the same shape | 0.54–0.64 |
| Hand-written, with a lookup table, and with a `switch` | 0.40, 0.31 |
| ata-validator, corvus (`jsonschema-benchmark`) | 0.36, 0.31 |

`instrumented.js` can't merge groups, so its matcher sets a bit for each
required name the instance has, and a `required` group reads its result
from them.

`ab.ts`, B/A, against HEAD, each corpus in a process of its own, on
`jsonschema-benchmark`'s 36 schemas and the usual corpora:

| | FLAG | Hooks that do nothing | `validateJson` |
| --- | --- | --- | --- |
| helm-chart-lock | 0.427 | 0.786 | 0.971 |
| omnisharp | 0.515 | 0.817 | 0.971 |
| pre-commit-hooks | 0.610 | 0.887 | 0.991 |
| dependabot | 0.758 | 0.761 | 1.04 (1.02–1.73) |
| unreal-engine-uproject | 0.763 | 0.879 | 0.986 |
| jasmine | 0.773 | 0.786 | 0.976 |
| draft-04 | 0.776 | 0.821 | 0.983 |
| ansible-meta | 0.793 | 0.801 | 0.939 |
| `package.json` | 0.931 | 1.019 | 0.996 |
| `tsconfig.json` | 0.965 | 0.991 | 1.016 |
| OpenAPI 3.0 | 0.968 | 1.023 | 1.009 |
| Others | 0.83–1.02 | 0.70–0.98 | 0.90–1.01 |

BASIC was 0.960–0.987 on the usual corpora, and annotating 0.992–1.010.

- The loop first took a schema with one property operation and a
  `required` or `type`, which made it a loop over every property instead of
  looking one name up. `tsconfig.json` was 1.18, OpenAPI 3.0 1.20, and
  five others 1.10–1.11. With two or more property operations, as before,
  they're 0.95–0.97.
- A loop with only `properties`, none of them only a type check, reading
  each name's evaluator from its entry made nest-cli 1.03. It has its own
  loop that calls the evaluator it looks up, and nest-cli is 0.99–1.00.
- semantic-release is 1.015–1.05, a few microseconds of a 0.12 ms corpus.
  Its objects have about three properties, under a schema that mixes type
  checks and other schemas.
- With hooks, most of `jsonschema-benchmark`'s schemas got 10–30% faster,
  and the usual corpora are the same. The same `src/` as A and B was
  0.996–0.997 with hooks.
- dependabot's `validateJson` was 1.456 with the others and 1.04 on its
  own, with an interquartile range up to 1.73. It includes parsing.
