# Inlining and combining

First recorded 2026-10-28.

[`combine`](../../components/kernel/optimizations/combine.md) inlines the
schemas a schema applies on the same instance and combines the
operations of the same kind. The corpora are the three real ones, the
draft-07 ones as 2020-12 (where `$ref` has siblings), and the 2019-09 and
2020-12 meta-schemas validating every schema in those (49 instances).
They're built by a script that isn't committed.

Before the pass, a count of what could combine on the same corpora: on
the meta-schemas, 45% of the schemas evaluated had something, about six
inlined `apply`s each, nearly all a repeated `typeIs`. On the real
corpora it was 1.4–3.6%.

`ab.ts`, FLAG, B/A, against HEAD:

| | B/A |
| --- | --- |
| SchemaStore `package.json` | 0.989 |
| SchemaStore `package.json` (2020-12) | 0.995 |
| SchemaStore `tsconfig.json` | 0.765 |
| SchemaStore `tsconfig.json` (2020-12) | 0.758 |
| OpenAPI 3.0 | 0.942 |
| 2019-09 meta-schema | 0.333 |
| 2020-12 meta-schema | 0.297 |

- Inlining and removing identical operations without combining the ones
  that differ was 1.003–1.017 of the whole pass.
- `validateJson` is mostly parsing: 0.94–1.03, within the noise.
- The pass is about 4 ms of `optimize` on `package.json` (`time-optimize.ts`),
  and `dispatch` after it about 1 ms more. The first `validate` in a fresh
  process (`cold-first-validate.ts`, median of 7) went from 193 to 205 ms
  on `package.json`, 56 to 60 ms on `tsconfig.json`, and 39.4 to 40.7 ms
  on OpenAPI 3.0.
- Before `annotate` was left out, inlined annotations were evaluated,
  and the 2020-12 corpora were 1.082 and 1.221.
