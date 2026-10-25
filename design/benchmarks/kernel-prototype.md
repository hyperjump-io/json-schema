# Kernel prototype

First recorded 2026-10-23.

A prototype of the kernel ([the kernel spec](../specs/kernel/README.md)) is in
`benchmark/claude/core/`:

- `core.ts`: the operations, the lowering (a table from keyword URIs to
  operations, standing in for each keyword's `lower`), the passes, and fast
  closures for plain values in FLAG
- `instrumented.ts`: evaluation with plugins, from the operations
- `cases.ts`: the corpora, the draft-07 corpora changed to 2020-12, and the
  test suite without remote schemas
- `run.ts`: FLAG against `validate` (`STATS=1` counts operations,
  `NO_FUSE=1` doesn't merge object and array operations)
- `compare.ts`: hook traces, BASIC, and DETAILED against v2, and their
  times (`NO_TIMES=1` only checks)
- `profile.ts`, `profile-instrumented.ts`: for `node --cpu-prof`

They run with `node` from the repo root (`node benchmark/claude/core/run.ts`)
and import `src/` directly, so they don't need `npm run link`.

It's earlier and coarser than [the kernel spec](../specs/kernel/README.md). It lowers today's compiled values,
not the schema AST, and its operations are bigger: one `object` operation
for `properties`, `patternProperties`, `additionalProperties`, and
`unevaluatedProperties`, one `array` operation, one `bound` for every limit,
`whenProperty` for `dependentSchemas`, and `call` for the keywords it doesn't
lower (`format`, `multipleOf`, `dependentRequired`, `contentSchema`, the old
`dependencies`, and the dynamic references). It doesn't support the dynamic
scope (9–16 test cases in each modern suite), only one plugin at a time, AST
instances, or annotating. Its fast closures don't track what's evaluated, so
a schema whose `unevaluated*` depends on the instance (16–20 test cases in
each modern suite) uses evaluation with plugins instead.

Results from 2026-10-23 (`v2` time divided by the prototype's, so more than
1 is faster; ranges are over runs):

| | FLAG | FLAG, not merged | BASIC | Every hook |
| --- | --- | --- | --- | --- |
| `package.json`, small | 0.99–1.07× | 0.83–0.89× | 1.00× | 1.00–1.02× |
| `package.json`, medium | 1.03–1.14× | 0.84–0.93× | 1.05–1.09× | 0.98–1.00× |
| `package.json`, large | 2.88–3.11× | 1.68–1.71× | 2.91–3.05× | 1.16–1.22× |
| `tsconfig.json` | 1.42–1.59× | 1.32–1.47× | 1.37–1.50× | 1.02–1.08× |
| OpenAPI 3.0 | 1.35–1.43× | 0.95× | 1.42× | 1.05× |
| Test suites | 1.39–1.76× | 1.30–1.59× | 1.05–1.19× | 1.17–1.28× |

The `package.json` and `tsconfig.json` rows include the 2020-12 versions,
which gave the same ratios.

- The fast closures got the same result as `validate` for every instance.
  Evaluating with a plugin that records every hook call (its locations,
  validity, the states passed to it, and which location object it got) gave
  the same calls as v2, about 4 million of them, and BASIC and DETAILED
  output were the same. Changing `oneOf` to stop at its second match made
  23 traces differ, so the comparison catches mistakes. For all 76 `if` and
  `conditional` keywords, the conditions the output formats find by keyword
  URI are the ones a `cases` operation has.
- Merging a schema's object and array operations into one loop is what makes
  real schemas faster. Without it, the prototype is slower than v2 on
  `package.json` and OpenAPI, because each operation iterates the
  properties again. Most of the rest of the speed is closures written for
  plain values.
- Small and medium `package.json` files hardly change. A profile has the
  merged property loop at 37% and the loop over a schema's operations at
  17%. They average 14 properties, and the root's `^_` pattern is tested on
  each one, which v2 does too. The large files are about 3 times faster,
  where v2 pays for `Object.entries` on big `dependencies` objects.
- Finding the instance's type once per schema and only evaluating the
  operations for it was up to 18% slower, so it isn't used.
- Evaluating with every hook was 0.76–0.82 times v2 at first. The profile
  had 19.5% in building JSON Pointers with `replaceAll`. With
  `JsonPointer.append`, like `specialize`, it's as fast as v2 or faster.
- BASIC on the v1, 2019-09, and 2020-12 suites is only 1.05–1.10 times
  faster, because the test cases whose `unevaluated*` depends on the
  instance use evaluation with plugins for their fast path.
- Lowering and building closures weren't timed.
