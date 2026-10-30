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
rendered size before minifying. `benchmark/bundle-size/entries-v1/` has
the same entries for v1, which `node bundle-size/measure.js entries-v1`
measures against the v1 worktree `benchmark/link.js` links.

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

## After the API as functions

Results from 2026-10-29, at the end of the plan's stage 6, the same entries
with the operations as functions (`validator`, `bundle`, `lint`), and
browser without its `rejson` and `jref` processors:

| Entry | Up front | Up front, gzipped | Total | Total, gzipped |
| --- | --- | --- | --- | --- |
| v1-validate-flag | 171.0 kB | 45.8 kB | 194.6 kB | 51.1 kB |
| v1-validate-basic | 172.4 kB | 46.2 kB | 196.0 kB | 51.6 kB |
| v1-bundle | 117.7 kB | 32.6 kB | 117.7 kB | 32.6 kB |
| v1-lint | 125.2 kB | 35.4 kB | 228.5 kB | 59.3 kB |
| all-dialects-validate | 184.8 kB | 47.9 kB | 208.4 kB | 53.4 kB |

- Each entry only has what it uses. Bundling and linting don't compile,
  so they leave out the kernel's evaluators and optimizations: bundling is
  49% smaller up front than before (44% gzipped), and linting 45% (39%),
  with its rules still loaded on demand.
- Validating values with FLAG is 25% smaller up front (21% gzipped). The
  instrumented evaluator (39 kB before minifying) is loaded with
  `import()` only for output formats, plugins, annotating, and JSON text
  or ASTs, so it's in the total, not up front. BASIC up front only adds
  the format itself. `validatorFor` and `annotatorFor` import it
  statically, because they're synchronous.
- None of the operations' savings happened until `"sideEffects": false`:
  without it, the bundler kept every module the package's entry point
  re-exports, and their imports. That took FLAG to 195.5 kB (54.0 kB
  gzipped).
- `unified` was in every bundle for two reasons. Every schema was resolved
  by a `unified()` pipeline (`src/schema/resolve-text.js`), which now parses
  with `rejsonParse`'s parser and calls the resolver's transformer
  directly (8 kB). And browser's `@hyperjump/browser/json` re-exported a
  `rejson` processor created when its module loaded, which bundlers had to
  keep. Removing it, and `jref`'s, saved another 16 kB. `vfile` stays (10 kB
  before minifying), because the resolver reports problems on a `VFile`.
  browser is `"sideEffects": false` too, which only changed how well the
  bundles compress (1.2 kB gzipped) once the processors were gone.
- What's left up front for FLAG, before minifying: the optimization
  passes (33 kB), the fast evaluator (29 kB), browser's JSON parser
  (14 kB), the resolver (14 kB), browser's HTTP support
  (`http-cache-semantics` and `content-type`, 23 kB), and `vfile` (10 kB).
- The other five dialects add 14 kB up front, 2 kB gzipped.

## Compared with v1

Results from 2026-10-30, v1 at 1.18.0 (its `main`, 28a940e, and the npm
release) against v2 at the end of the API as functions. The v1 entries do
the same things with v1's API: `validate(uri)` for a validator,
`validate(uri, instance, "BASIC")`, and `bundle` from
`@hyperjump/json-schema/bundle`, with each dialect imported. v1 has no
lint. v1 loads everything up front, so its totals are the same.

| Entry | v1 up front | v2 up front | v2 / v1 | v1 gzipped | v2 gzipped | v2 / v1 |
| --- | --- | --- | --- | --- | --- | --- |
| v1-validate-flag | 69.0 kB | 171.0 kB | 2.5× | 17.7 kB | 45.8 kB | 2.6× |
| v1-validate-basic | 69.1 kB | 172.4 kB | 2.5× | 17.7 kB | 46.2 kB | 2.6× |
| v1-bundle | 75.8 kB | 117.7 kB | 1.6× | 19.6 kB | 32.6 kB | 1.7× |
| all-dialects-validate | 118.8 kB | 184.8 kB | 1.6× | 21.4 kB | 47.9 kB | 2.2× |

v1's bundles are complete: its keywords and formats are in them. Where the
difference comes from, for FLAG, before minifying (268 kB in v2, 130 kB in
v1):

- Compiling and evaluating: v2's kernel is 77 kB (the optimization passes
  33 kB, the fast evaluator 29 kB, lowering and the kernel's operations
  15 kB), and its keyword definitions with their checks 23 kB. v1's
  keywords compile and evaluate themselves, in 42 kB.
- Parsing: v2 parses schemas with browser's JSON parser and scanner
  (24 kB), so every node has a position. v1 uses `JSON.parse`.
- Resolving: v2's resolver, which builds the schema AST and reports
  problems with positions, and its registry index and sessions, are 31 kB.
  v1's registered schemas (`lib/schema.js`) are 8 kB.
- Dependencies v1 doesn't have: `http-cache-semantics` (13.5 kB) for
  browser's HTTP cache, and `vfile` and `vfile-message` (17 kB) for
  problems with positions.

Most of it is what v2 adds on purpose: positions everywhere, a schema AST
for editors and the language server, the kernel and the optimizations
that make it faster, HTTP caching, and sessions. Every dialect costs v2
less than v1 (14 kB against 50 kB up front), because most of the code is
shared by them. v2 with one dialect is still 2.1× v1 with every dialect,
gzipped.

