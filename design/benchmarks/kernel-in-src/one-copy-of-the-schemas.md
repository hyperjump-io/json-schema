# One copy of the schemas, and what's read recorded when lowering

First recorded 2026-10-24.

Passes return the schemas they replace, and `optimize` puts them in one
copy. That didn't change `package.json`, where `fold-passing`'s table of
every schema already was the only copy, and saved 0.15–0.3 ms on
`tsconfig.json` and OpenAPI 3.0. Profiling `fold-passing` found 1.7 ms of
its 4.9 ms asking whether anything reads marks. `fast.js` asked again, and
whether anything reads the dynamic scope (2.0 ms, on a draft-07 schema with
no `dynamicApply`), each time it built an evaluator. Lowering records both
in the kernel's `reads` now. `time-phases.ts`, two runs each, HEAD then
after:

| | Lower | Optimize for FLAG | Build fast, first FLAG | Optimize and build with plugins, first evaluation |
| --- | --- | --- | --- | --- |
| `package.json` | 15.9–19.6 → 16.2–20.8 ms | 7.2–12.3 → 6.5–12.0 ms | 8.1–15.3 → 3.7–12.4 ms | 13.6–20.8 → 10.2–22.3 ms |
| `tsconfig.json` | 1.27–1.46 → 1.61–2.17 ms | 0.98–1.08 → 0.64–0.67 ms | 0.44–0.50 → 0.36–0.39 ms | 1.38–1.54 → 1.04–1.20 ms |
| OpenAPI 3.0 | 1.53–1.64 → 1.75–1.84 ms | 0.56–0.59 → 0.39–0.40 ms | 0.54 → 0.47–0.48 ms | 1.09–1.12 → 0.92–0.99 ms |

- Lowering does the walks now, once per compile instead of each time an
  evaluator is built: about 0.3 ms more on `tsconfig.json`, within the
  noise on `package.json`.
