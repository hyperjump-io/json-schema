# Evaluator and pass speedups

First recorded 2026-10-24.

`time-flag.ts` times FLAG with `src/` alone (median of 11 rounds), before
and after, measured change by change and alternated when close. A CPU
profile of FLAG on `package.json` showed 14% in the closure that forwards
to a schema's evaluator while it's being built, for schemas that apply
themselves. The first `apply` of each schema kept calling through it, and
3,575 of `package.json`'s 3,643 applied schemas are applied from one place.

| FLAG | Forwarding fixed | Bit mask | `any` of types | Unrolled | All, with `type-dispatch` |
| --- | --- | --- | --- | --- | --- |
| `package.json` | 1.08–1.22× | 1.03–1.07× | – | 1.07–1.08× | 1.21–1.34× |
| `package.json` (2020-12) | | | | | 1.30–1.47× |
| `tsconfig.json` | 1.2× | 1.05× | 1.08–1.12× | 1.16× | 1.36–1.49× |
| OpenAPI 3.0 | 1.15× | – | – | 1.1× | 1.08× |

- Fixing the forwarding in `instrumented.js` made evaluating with every
  hook 3–5% faster.
- Choosing a `one`'s schema by type was 4–15% faster on `package.json`.
- As a pass, `type-dispatch` was as fast as the same thing done while
  building the evaluator. It takes about 4 ms on `package.json` (9 ms
  cold), half of it iterating and copying `schemas`, 0.4 ms on
  `tsconfig.json`, so it's earned back after 10–15 small `package.json`
  validations.
