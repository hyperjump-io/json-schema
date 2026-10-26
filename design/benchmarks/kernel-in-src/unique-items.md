# Unique items

First recorded 2026-10-25.

After [Item loops](item-loops.md), v2 was slowest compared to the other
implementations in `jsonschema-benchmark` on SchemaStore's Unreal Engine
`.uproject` schema (4.0 times ata-validator, 7.1 times corvus). Its 859
instances are only about 20 thousand values, but `Plugins` is an array of
objects like `{ "Name": "AirSim", "Enabled": true }` with `uniqueItems`,
up to 121 of them. `uniqueItems` compared every pair with `instanceEqual`,
48,858 comparisons for each run of the corpus, about 50 ns each, because
it reads values through `InstanceOps`. That was 76% of the profile.

On that corpus alone (ms for each run of it):

| | ms |
| --- | --- |
| Before | 3.3 |
| A set of canonical JSON text for arrays and objects | 3.55 |
| Every pair, compared as plain values | 1.67 |
| And arrays of 8 or more compared only with the items that could be equal | 0.66 |
| ata-validator, corvus (`jsonschema-benchmark`) | 0.83, 0.47 |

Making canonical text for each item, with its names sorted, cost more
than the comparisons it saved. Bucketing by one property's value only
compares the objects that have the same value for it, and equal objects
do. 8 was a little faster than 16 or 32 as where the buckets start.

`ab.ts` FLAG, B/A, against HEAD, each corpus in a process of its own, on
`jsonschema-benchmark`'s 36 schemas and the usual corpora:

| | B/A |
| --- | --- |
| unreal-engine-uproject | 0.192 |
| draft-04 | 0.849 |
| GeoJSON | 0.908 |
| ansible-meta | 0.933 |
| stylecop | 0.963 |
| OpenAPI 3.0 | 0.969 |
| `package.json`, `tsconfig.json` | 0.989–0.995 |
| Others | 0.96–1.01 |

- GeoJSON doesn't have `uniqueItems`. Its `enum`s of one value are
  `equals`, which `equal` decides with `===` before anything else.
- yamllint was 1.049 with the others and 0.962–0.983 twice on its own.
  helm-chart-lock was 1.031–1.041, but nothing it evaluates changed, and
  the same `src/` as A and B was 1.004–1.039 on it, so that's the harness.
