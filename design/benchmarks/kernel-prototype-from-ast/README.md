# Kernel prototype from the schema AST

First recorded 2026-10-23.

A second prototype, in `benchmark/claude/kernel/`, is built on [the kernel spec](../../specs/kernel/README.md)'s
operations:

- `kernel.ts`: the expressions
- `lower.ts`: lowering from the schema AST. Values are parsed by their
  shape, with `"reference"` and `"unappliedSchema"`, and siblings are named
  inputs. A table stands in for each keyword's `lower`.
- `normalize.ts`, `optimize.ts`: the normal form, and folding schemas that
  always pass, like `alwaysPasses` today. With plugins, it also leaves out
  groups that have no effect the plugins can see (`dropGroups`), which
  includes `annotate` for plugins without an `annotation` hook.
- `fast.ts`: FLAG for plain values, with every operation, including marks
  and the dynamic scope. A schema's property operations can be merged into
  one loop.
- `instrumented.ts`: evaluation with plugins, of plain values and ASTs.
  `mergeProperties` merges matching properties across groups.
- `output.ts`: BASIC and DETAILED, finding conditions and whether a keyword
  explains its failure from the expression, not keyword URIs
- `run.ts`: FLAG against `validate`. `compare.ts`: hook traces on plain
  values and ASTs, BASIC, and DETAILED against v2, and their times
  (`NO_TIMES=1` for both only checks).
- `profile.ts`, `profile-instrumented.ts`: for `node --cpu-prof`
- `analysis.ts`, `lint-check.ts`, `contradictory-limits.ts`: lowering for
  lint (see [Lowering for lint](lowering-for-lint.md) below). `contradictory-limits.test.ts` is
  the rule's tests, run against the port, and `extra.test.ts` has a few
  more. They run with `npx vitest run benchmark/claude/kernel/`.

The v2 it's compared with, the baseline, is a worktree of `2ef89f6` at
`../json-schema-kernel-baseline`. Its `@hyperjump/browser` has to be the
browser it was written for, so its `node_modules/@hyperjump/browser` links
to a worktree of browser `3a964e3` at `../browser-kernel-baseline`, whose
`node_modules` links to `../browser/node_modules`. Linked to the browser
repo, it broke when the browser's API changed on 2026-10-30 (plugins only
in the config). Vitest keeps modules with their imports resolved in
`node_modules/.vitest-cache`, so after changing a link, delete it in the
root and in `benchmark/`.

Results from 2026-10-23 (`v2` time divided by the prototype's, so more than
1 is faster):

| | FLAG, merged | FLAG, not merged | BASIC | Every hook | Every hook, AST |
| --- | --- | --- | --- | --- | --- |
| `package.json`, small | 1.11–1.14× | 0.54–0.56× | 1.43–1.56× | 0.99–1.04× | 0.94–1.00× |
| `package.json`, medium | 1.06–1.07× | 0.73× | 1.35–1.48× | 0.98–1.01× | 0.98–0.99× |
| `package.json`, large | 2.51–2.74× | 1.62–1.74× | 2.91–3.21× | 1.03–1.06× | 1.02–1.03× |
| `tsconfig.json` | 1.48–2.15× | 0.80–0.92× | 1.58–1.98× | 0.91–1.01× | 0.91–1.05× |
| OpenAPI 3.0 | 1.30× | 0.75× | 1.97× | 1.02× | 0.98× |
| Test suites | 0.94–1.23× | 0.91–1.25× | 1.03–1.05× | 1.05–1.27× | 1.06–1.22× |

- Every test case and corpus lowers, including the dynamic scope (26 test
  cases) and `unevaluated*` that depends on the instance (220), which the
  first prototype couldn't evaluate. FLAG agreed with `validate` on every
  instance. Dropping the marks `any` keeps made 9 cases disagree, so the
  check catches mistakes.
- With plugins, about 8 million hook calls were the same as v2's, on plain
  values and on ASTs. BASIC and DETAILED were the same, except for 58 BASIC
  results where the kernel says a keyword explains its failure and
  `simpleApplicator` doesn't (`conditional`, `dependencies` with only
  schemas, `anyOf` and `oneOf` with one schema). Each is v2's output
  without those keywords' errors.
- `dynamicApply` doesn't need dialect rules. Whether 2020-12's
  `$dynamicRef` and 2019-09's `$recursiveRef` use the dynamic scope is
  decided when lowering, and the dynamic-scope test cases pass.
- The check with plugins found a bug FLAG didn't: `hasProperty` passes
  non-objects, so as a condition it applied `dependentSchemas`' schemas to
  strings and arrays. No test case has a dependent schema that fails a
  non-object. Conditions now say their type ([the kernel spec](../../specs/kernel/README.md), `cases`).
- Merging property loops is what makes real schemas faster, as in the first
  prototype. Without it, `package.json` is half as fast as v2. The merged
  loop was only 0.69 times v2 on `package.json` until `additionalProperties`
  next to its `properties` was "nothing else matched" instead of testing
  the names and patterns again, and children got their own marks only when
  they read them, instead of a check in the loop.
- Folding schemas that always pass was worth 10–20% on `package.json`.
- With every hook, it started at 0.75–0.96 times v2. The loop over a
  group's property operations allocated on every property, every
  subschema had an extra wrapper, and the dynamic scope was tracked when
  nothing read it. Without those, it's about as fast as v2.
- Lowering, building closures, and annotating weren't timed.
