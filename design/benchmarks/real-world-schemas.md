# Real-world schemas

First recorded 2026-10-21.

`benchmarks/real-world.bench.ts` compares implementations the same way on
real schemas: SchemaStore's `package.json` schema (draft-07) with 3000
`package.json` files, its `tsconfig.json` schema (draft-07) with 194
`tsconfig.json` files (both from `~/Projects`), and the OpenAPI 3.0 schema
(draft-04) with its examples and two more OpenAPI documents, one of them the
335 KB openEO API. ajv is only in the draft-07 comparisons. `data/build-corpus.mjs` builds the corpora. Instances are
grouped by the size of their JSON text: small (under 1 KB), medium (1–10 KB),
and large (10 KB or more). Instances don't have an expected result, so an
instance is left out if the implementations don't all agree on it. With
`format` validation off, they agree on every one. ata-validator doesn't
support draft-04, and schemasafe can't compile the `package.json` or
OpenAPI schemas when it collects errors.

Results from 2026-10-21 (mean time per run of the group, in ms):

| FLAG | Instances | v2 | `@hyperjump/json-schema@1` | corvus | ata-validator | ajv | schemasafe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `package.json`, small | 1472 | 1.94 | 7.28 | 0.411 | 10.4 | 11.0 | 4.26 |
| `package.json`, medium | 1514 | 8.22 | 25.7 | 2.01 | 22.1 | 26.9 | 12.5 |
| `package.json`, large | 14 | 1.01 | 2.09 | 0.145 | 0.234 | 0.729 | 0.415 |
| `tsconfig.json`, small | 191 | 0.304 | 1.22 | 0.041 | 2.41 | 2.98 | 0.858 |
| `tsconfig.json`, medium | 3 | 0.0113 | 0.0487 | 0.0016 | 0.0040 | 0.0191 | 0.0179 |
| OpenAPI 3.0, medium | 6 | 0.116 | 0.366 | 0.0198 | | | 0.113 |
| OpenAPI 3.0, large | 1 | 0.411 | 1.80 | 0.0840 | | | 0.612 |

| All errors | Instances | v2 | `@hyperjump/json-schema@1` | corvus | ata-validator | ajv | schemasafe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `package.json`, small | 1472 | 2.29 | 10.1 | 12.8 | 11.0 | 11.2 | |
| `package.json`, medium | 1514 | 9.13 | 43.2 | 56.3 | 23.1 | 27.1 | |
| `package.json`, large | 14 | 1.02 | 4.07 | 3.49 | 0.236 | 0.834 | |
| `tsconfig.json`, small | 191 | 0.325 | 2.47 | 3.10 | 2.44 | 3.01 | 0.973 |
| `tsconfig.json`, medium | 3 | 0.0117 | 0.110 | 0.124 | 0.0040 | 0.0173 | 0.0217 |
| OpenAPI 3.0, medium | 6 | 0.119 | 0.681 | 0.549 | | | |
| OpenAPI 3.0, large | 1 | 0.416 | 2.97 | 2.03 | | | |

- v2 is faster than `@hyperjump/json-schema@1` on every group:
  2.1–4.4 times at FLAG and 4.0–9.4 times at errors.
- corvus is the fastest at FLAG on every group, 4.1–7.3 times faster than
  v2. The gap is 4–5 times on small and medium `package.json`
  files and about 7 times on large ones, so v2 falls further
  behind as instances get bigger.
- The test suite makes v2 look worse at FLAG than these
  schemas do. ata-validator and schemasafe are 2–4 times faster on the
  suite, but v2 is faster than both on small and medium
  `package.json` files and small `tsconfig.json` files, and about the same
  as schemasafe on the medium OpenAPI documents. They're 2.4–4.3 times
  faster on large `package.json` files, and ata-validator is faster on the
  three medium `tsconfig.json` files. ata-validator takes about 7–17 µs for
  each `package.json` file whatever its size, so it's slow on many small
  instances and fast on big ones.
- ajv, which is about as fast as v2 at FLAG on the draft-07
  suite, is 3.3–9.8 times slower on the small and medium `package.json`
  files and the small `tsconfig.json` files, 1.7 times slower on the medium
  `tsconfig.json` files, and 1.4 times faster on the large `package.json`
  files. Why hasn't been looked into.
- Almost every instance is valid (35 of the 3000 `package.json` files fail,
  and none of the others do), so the errors results are mostly the cost of
  being ready to collect errors. v2 only collects errors on a
  second evaluation of an invalid instance, so its errors cost at most
  about 1.2 times its FLAG here. corvus's results collector costs 24–78
  times its FLAG even when there's nothing to report, which is why
  v2 is the fastest at errors on most groups.
  ata-validator's errors cost the same as its FLAG, so it's fastest on
  large valid instances.
- The `tsconfig.json` medium and OpenAPI groups have only a few instances,
  so they mostly show how those documents do. The one small OpenAPI
  document is left out of the tables. It's invalid at the root, so it only
  times how fast each implementation fails.
