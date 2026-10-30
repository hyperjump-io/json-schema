# Bundle size

First recorded 2026-10-29.

How much of the library a browser app gets for what it uses, before the API
became functions (see [The API as functions](../components/api/README.md)),
so the change can be measured against it.

`benchmark/bundle-size/measure.js` bundles each small entry script in
`benchmark/bundle-size/entries/` on its own with Vite 8.3.4 in library mode,
minified, for browsers (so browser's `#` imports resolve to their browser
files). Nothing is external. "Up front" is the entry chunk and the chunks it
imports statically. "Total" adds the chunks loaded by `import()`, which is
how lint's recommended rules are loaded. Gzipped is level 9.
`benchmark/bundle-size/breakdown.js` lists what a bundle is made of, by
rendered size before minifying.

Each entry creates a `JsonSchema`, adds its dialects, and calls one
operation:

| Entry | Does |
| --- | --- |
| v1-validate-flag | `addV1`, `compile`, `validate` |
| v1-validate-basic | the same, with `output: "BASIC"` |
| v1-bundle | `addV1`, `bundle` |
| v1-lint | `addV1`, `lint` |
| all-dialects-validate | every `add*` dialect function, `compile`, `validate` |

Since the definitions moved to the config (stage 2 of the plan in
`TODO.md`), the entries put the dialects in the `dialects` config instead,
and otherwise do the same thing.

## Before the API as functions

Results from 2026-10-29, at c332b10:

| Entry | Up front | Up front, gzipped | Total | Total, gzipped |
| --- | --- | --- | --- | --- |
| v1-validate-flag | 229.4 kB | 57.8 kB | 322.3 kB | 79.4 kB |
| v1-validate-basic | 229.4 kB | 57.9 kB | 322.3 kB | 79.4 kB |
| v1-bundle | 229.4 kB | 57.8 kB | 322.3 kB | 79.4 kB |
| v1-lint | 229.4 kB | 57.8 kB | 322.3 kB | 79.4 kB |
| all-dialects-validate | 255.6 kB | 60.8 kB | 348.5 kB | 82.4 kB |

- Every v1 entry is the same bundle. The operations are methods on
  `JsonSchema` and `JsonSchemaSession`, so validating brings in bundling,
  linting, and every output format, and the lint rules are in every
  bundle's total.
- The recommended lint rules are most of the difference between up front
  and total (143 kB of `src/lint` before minifying). They're only loaded
  when `lint` is called without `plugins`, through `import()`.
- Up front, before minifying, the kernel is the largest part (126 kB):
  the instrumented evaluator, which only the output formats and annotating
  use, is 39 kB of it, the optimization passes 33 kB, and the fast
  evaluator 29 kB. Then browser's JSON parsing (29 kB), the keywords
  (23 kB), `vfile` (20 kB), and `unified` (16 kB), which validating
  doesn't need.
- The other five dialects add 26 kB, 3 kB gzipped.
