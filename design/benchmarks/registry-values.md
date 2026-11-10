# Registry values

First recorded 2026-11-10, on Node.js 22.22.1, when a schema added to a
registry as a value started being resolved from `JSON.parse` and `fromJs`
instead of browser's parser (see
[Registries](../components/registries/README.md)).

## Building the tree

The text is what the registry makes from a value, `JSON.stringify` with two
spaces, from three of the `jsonschema-benchmark` schemas. Milliseconds, the
first of 8 calls in one process, then the mean of the last 3:

| Schema | Text | `fromJson`, first | `fromJson`, warm | `JSON.parse` and `fromJs`, first | `JSON.parse` and `fromJs`, warm |
| --- | --- | --- | --- | --- | --- |
| `geojson` | 46 KB | 6.7 | 1.67 | 0.6 | 0.30 |
| `cspell` | 129 KB | 5.8 | 2.17 | 0.7 | 0.93 |
| `ui5-manifest` | 393 KB | 11.9 | 8.02 | 3.9 | 1.73 |

## Compiling

In the `jsonschema-benchmark` harness, which adds each schema as a value
and times creating the registry and `validator()`, the geometric mean of
the compile time of 36 schemas went from 20.35 milliseconds to 15.50, with
`@hyperjump/uri` at `9a09275` in both runs. The schemas that changed most
are the largest. Milliseconds, the median of 3 runs:

| Schema | Before | Now |
| --- | --- | --- |
| `ui5-manifest` | 121.9 | 92.5 |
| `clang-format` | 38.0 | 22.0 |
| `cspell` | 43.8 | 30.5 |
| `ui5` | 47.8 | 35.5 |
| `vercel` | 27.4 | 16.0 |
| `importmap` | 10.6 | 8.7 |

Validating didn't change: cold and warm times were the same within noise.

## Same results

Each benchmark schema's compiled schema, serialized, was the same as
before. The schema with a problem, `krakend`, had the same problem, without
its `place`.
