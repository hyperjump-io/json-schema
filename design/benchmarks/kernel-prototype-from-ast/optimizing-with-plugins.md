# Optimizing with plugins

First recorded 2026-10-23.

`compare.ts` also evaluates with optimizations and plugins: merged matching
alone, and every optimization (`optimize.ts` with `dropGroups`, and merged
matching). Merged matching alone made the same hook calls as v2. With every
optimization, BASIC and DETAILED were the same as without, every result was
the same, and every trace was a subsequence of the unoptimized one. Making
merged matching always pass made 37 checks fail.

Plugin path only: the BASIC plugin on every instance, valid ones included.
BASIC output only uses it for instances that fail (1.4–3.2 times v2 on the
real schemas in [Kernel prototype from the schema AST](README.md), because most of their instances are valid). Results
from 2026-10-23, one run, which was noisy: the suites' rows moved by 10–20%
between runs where nothing they use changed.

| | Kernel | Merged matching | Every optimization |
| --- | --- | --- | --- |
| `package.json` | 0.89–0.98× | 0.93–1.15× | 1.05–1.21× |
| OpenAPI 3.0 | 0.84× | 1.05× | 1.08× |
| `tsconfig.json` | 0.75–0.91× | 0.84–0.94× | 0.93–1.08× |
| Test suites | 0.95–1.02× | 0.93–1.06× | 0.96–1.04× |

- Hook calls have to nest, because output formats depend on it, so merging
  across groups can't evaluate their subschemas interleaved. Only matching
  is merged: one pass finds the groups' operations each property is for,
  and each group evaluates its matches between its own hooks.
- Merged matching was worth 7–25% on `package.json` and OpenAPI, and
  nothing on `tsconfig.json` and the suites, whose schemas rarely have more
  than one property group.
- Leaving out what BASIC can't see (annotation-only groups, and the schemas
  that leaves with nothing) was worth more, about 5–15%.
- The kernel's BASIC plugin was 0.69–0.92 times v2 at first, with hooks
  that do nothing about as fast as v2. It allocated an object for every
  keyword and looked up whether the keyword explains its failure in a
  `WeakMap`. With `explainsFailure` and `conditions` computed once in
  `KeywordInfo`, and a number as the state when there are no conditions,
  like v2, it's 0.75–1.02.
- With hooks that do nothing, every optimization was 0.89–1.30 times v2.
