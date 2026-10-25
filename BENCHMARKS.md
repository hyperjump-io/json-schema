# Benchmarks

Measurements behind the performance decisions in [DESIGN.md](DESIGN.md).
The benchmark code is in `benchmark/`, which isn't committed. It compares the
version checked out here with the other one, which it checks out in a
worktree next to this repo (see `benchmark/link.js`). The
benchmarks in `benchmarks/` are kept up to date. The ones in `claude/` were
written for one-off investigations.

## Test suite

The benchmark (`benchmarks/test-suite.bench.ts`) is ported from
`@hyperjump/json-schema@1`'s. It compares implementations over the v1 test cases of the
JSON-Schema-Test-Suite, and over the draft-04, draft-06, draft-07, 2019-09,
and 2020-12 test cases, which v2 evaluates with those presets.
ata-validator doesn't support draft-04, so it isn't in that comparison. Test
cases tagged for `format` are left out. A test case that any implementation
gets wrong is left out for every implementation. In those drafts,
v2 only gets the two `file:` identifier test cases wrong, which
it rejects on purpose. In draft-04 through draft-07, `@hyperjump/json-schema@1`
also gets two legacy identifier test cases wrong. Every implementation runs
with `format` validation off. The results in the first table were measured
when v2 and `@hyperjump/json-schema@1` still validated draft-04
through draft-07 formats, which didn't matter, because the untagged test cases
only use `format` on values that aren't strings, which `format` skips.

The first table and its notes are from early on, before errors and plugins
got faster. Only draft-07 and 2020-12 are enabled in the benchmark now.

Results (mean time per run of the suite, FLAG unless it says errors):

| | v2 | `@hyperjump/json-schema@1` |
| --- | --- | --- |
| v1 | 0.27–0.28 ms | 0.74–0.79 ms |
| v1, after evaluating ASTs | 0.31–0.33 ms | 0.75 ms |
| v1, all errors | 1.58–1.64 ms | 1.36–1.39 ms |
| draft-04 | 0.08 ms | 0.21 ms |
| draft-04, all errors | 0.56–0.57 ms | 0.43–0.44 ms |
| draft-06 | 0.11 ms | 0.26 ms |
| draft-06, all errors | 0.74–0.76 ms | 0.56–0.57 ms |
| draft-07 | 0.12 ms | 0.29 ms |
| draft-07, all errors | 0.77–0.78 ms | 0.62–0.63 ms |
| 2019-09 | 0.29 ms | 0.76–0.79 ms |
| 2019-09, all errors | 1.64–1.80 ms | 1.43–1.47 ms |
| 2020-12 | 0.30 ms | 0.84–0.85 ms |
| 2020-12, all errors | 1.78–1.83 ms | 1.53–1.63 ms |

- FLAG is about 2.7–2.9 times faster than `@hyperjump/json-schema@1` in v1,
  about 2.5 times faster in draft-04, about 2.4 times faster in draft-06 and
  draft-07, about 2.7 times faster in 2019-09, and about 2.85 times faster in
  2020-12.
- `validate` is about 15% slower in a process that has also evaluated
  ASTs, because keyword code is shared (see "Compile and evaluate" in DESIGN.md).
- Collecting errors (BASIC) is about 1.16–1.18 times slower than
  `@hyperjump/json-schema@1` in v1, about 1.29–1.31 times slower in draft-04,
  about 1.30–1.36 times slower in draft-06, about 1.24 times slower in
  draft-07, about 1.15–1.22 times slower in 2019-09, and about 1.12–1.16 times
  slower in 2020-12. It was about 5 times slower until errors stopped
  capturing stack traces (see "Validation API" in DESIGN.md).
- Measurements drift by several percent between sessions. The v1 errors
  row was first measured at 1.52–1.54 ms (about 1.13 times slower). Run
  side by side later, the code from then and the current code both took
  1.60–1.66 ms, so it wasn't a regression. The "after evaluating ASTs" row
  is from the first session.
- `@exodus/schemasafe`, which generates code, is the fastest at collecting
  errors. It's about 14 times faster than v2 in draft-04, about
  10 times faster in draft-06 and draft-07, about 6.8–7.3 times faster in
  2019-09, and about 4.6–4.7 times faster in 2020-12.
- With the `format` test cases, format validators take most of the time,
  and FLAG is only about 1.4 times faster.

Every implementation, measured on 2026-10-21 (mean time per run of the
suite; 2020-12 is the range over two runs that day):

| draft-07 | FLAG | All errors |
| --- | --- | --- |
| v2 | 0.051 ms | 0.255 ms |
| `@hyperjump/json-schema@1` | 0.272 ms | 0.615 ms |
| `@corvus-dotnet/json-schema` | 0.022 ms | 0.384 ms |
| ata-validator | 0.018 ms | 0.339 ms |
| ajv | 0.052 ms | 0.071 ms |
| `@exodus/schemasafe` | 0.025 ms | 0.077 ms |

| 2020-12 | FLAG | All errors |
| --- | --- | --- |
| v2 | 0.237–0.243 ms | 0.761–0.785 ms |
| `@hyperjump/json-schema@1` | 0.907–0.912 ms | 1.661–1.668 ms |
| `@corvus-dotnet/json-schema` | 0.058–0.061 ms | 0.863–0.893 ms |
| ata-validator | 0.061–0.068 ms | 1.094–1.124 ms |
| `@exodus/schemasafe` | 0.081–0.113 ms | 0.353–0.404 ms |

- In draft-07, ajv gets four test cases wrong and `@hyperjump/json-schema@1`
  gets one wrong and can't compile three, so those are left out for every
  implementation. ajv isn't in the 2020-12 comparison.
- ata-validator, corvus, and schemasafe, which generate code, are 2–4 times
  faster than v2 at FLAG. ajv, which generates code too, is
  about the same as v2 in draft-07. v2 is
  3.7–5.3 times faster than `@hyperjump/json-schema@1`.
- At collecting errors, ajv and schemasafe are the fastest, 3.3–3.6 times
  faster than v2 in draft-07. In 2020-12 only schemasafe is
  faster, about 2 times. v2 is faster than corvus,
  ata-validator, and `@hyperjump/json-schema@1` (2.1–2.4 times) in both. 41%
  of the 2020-12 suite's instances are invalid.
- v2's draft-07 times are less than half of the first table's
  (FLAG 0.12 ms and errors 0.77 ms then).
- How errors got there: v2 was the slowest at collecting
  errors in 2020-12 (1.83 ms), when errors were `VFileMessage`s with a
  message built for each one. Plain objects without messages (see
  "Validation API" in DESIGN.md) took it to 1.16 ms, and the changes in
  "Plugins" to 0.76–0.79 ms. `benchmark/claude/errors-breakdown.ts`
  measures each part of collecting errors.

## Real-world schemas

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

## Modes

`benchmarks/modes.bench.ts` times every mode of a
`Validator` against the others, without other implementations. It runs on
the v1 test cases v2 gets right. Each instance is a JS value,
its JSON text, or a JSON AST built from it with browser's `fromJs` before
the timed part. Annotating a node adds to the annotations already on it, so
`annotateNode` gets new nodes before each run, which isn't timed. Error modes
go through every error.

Results from 2026-10-21 (mean time per run of the suite, the range over
five runs):

| Mode | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| FLAG | 0.21–0.22 ms | 2.27–2.72 ms | 0.33–0.35 ms |
| BASIC | 0.72–0.74 ms | 3.00–3.43 ms | 0.86–1.02 ms |
| DETAILED | 0.72–0.82 ms | 3.15–3.66 ms | 0.88–1.01 ms |
| Annotations | 0.84–1.21 ms | 2.62–2.89 ms | 0.70–0.78 ms |

- Parsing JSON text costs more than evaluating in every mode. FLAG on text
  is about 10–13 times slower than on a value, and about 2–2.5 ms of every
  text row is parsing. The text rows and `annotate` vary the most between
  runs, by up to 20% and 44%.
- FLAG on an AST is about 1.6 times slower than on a value. An AST is
  evaluated by its own specialization, which reads values through the nodes
  (see "Compile and evaluate" in DESIGN.md). It was about 2 times slower
  until `Validator` stopped building a string key to find the
  specialization on every call.
- DETAILED costs about the same as BASIC now that both collect errors in
  one list (see "Output formats" in DESIGN.md). It was 1.08–1.16 times
  slower.
- BASIC and DETAILED are less than half what they were (1.70 ms and
  1.98 ms for a value before errors became plain objects and the changes
  in "Plugins"). BASIC is now faster than annotating a value, but
  `annotateNode` is still faster than BASIC on an AST. `annotate` is slower
  than `annotateNode` because it builds the AST from the value itself.
- 2020-12 gives results within a few percent of v1. The suite's test cases
  mostly don't have `$schema`, so both run nearly the same test cases with
  mostly the same keywords.

## Plugins

`benchmark/claude/plugin-cost.ts` times evaluating with plugins on the
2020-12 test cases v2 gets right (1290 instances), as a JS
value and as a JSON AST (`validateNode`). The plugins are an empty one,
one with hooks that do nothing, two of those, one that keeps a little state
for every schema and keyword, one that reads every location, and BASIC's.

Results (mean time per run of the suite, before and after the changes in
"Plugins" in DESIGN.md, measured in one session):

| | Value, before | Value, after | AST, before | AST, after |
| --- | --- | --- | --- | --- |
| FLAG | 0.179 ms | 0.187 ms | 0.353 ms | 0.283 ms |
| Empty plugin | 0.848 ms | 0.532 ms | 1.003 ms | 0.574 ms |
| Hooks that do nothing | 0.945 ms | 0.594 ms | 1.067 ms | 0.618 ms |
| Two of those | 1.053 ms | 0.832 ms | 1.330 ms | 0.863 ms |
| State for each schema and keyword | 0.948 ms | 0.634 ms | 1.086 ms | 0.682 ms |
| Reads every location | 0.941 ms | 0.601 ms | 1.009 ms | 0.633 ms |
| BASIC's plugin | 1.137 ms | 0.831 ms | 1.325 ms | 0.911 ms |
| BASIC output | 1.068 ms | 0.873 ms | 1.264 ms | 0.958 ms |

- Combining plugins into one was the biggest change, about 25%. It
  removed an array of states for every schema and keyword evaluation.
- `Validator` built a string key to look up the specialization on every
  call. Indexing them by mode made FLAG on an AST about 15% faster.
- Building the keyword location lazily, building a subschema's location
  without slicing, the location class, and not escaping array indexes
  saved about 3–6% each.
- With hooks that do nothing, what's left is about 3.2 times FLAG for a
  value and 2.2 times for an AST. Evaluating every keyword without plugins
  took 0.32 ms (value) and 0.41 ms (AST). Tracking locations without
  creating them or calling hooks added about 0.1 ms, creating locations
  about 0.11 ms, and calling hooks about 0.06 ms.
- BASIC's plugin cost about 0.24 ms more than hooks that do nothing. It
  allocated an array for every schema and keyword evaluation.

BASIC and DETAILED collect errors in one list now (see "Output formats" in
DESIGN.md). Measured back to back with the code before, twice each:

| | Before | After |
| --- | --- | --- |
| BASIC's plugin, value | 0.73–0.76 ms | 0.60–0.61 ms |
| BASIC's plugin, AST | 0.81–0.85 ms | 0.69–0.71 ms |
| BASIC output, value | 0.76–0.79 ms | 0.67–0.68 ms |
| BASIC output, AST | 0.86–0.88 ms | 0.78 ms |
| BASIC, invalid instances only | 0.61–0.65 ms | 0.53–0.54 ms |
| DETAILED, invalid instances only | 0.63–0.66 ms | 0.57 ms |

- Replacing the arrays with one list didn't change anything by itself.
  Cutting the list back by setting its length, which happens after every
  passing schema and keyword, cost as much as the arrays had. Only setting
  it when the list is longer made the difference.
- BASIC's plugin now costs about the same as hooks that do nothing.
- `benchmark/claude/output-equivalence.ts` checks that the output is
  the same as before for every test case in every dialect, as values, as
  JSON text, and with another plugin. The only difference was that
  DETAILED's `errors` for `if` and `conditional` had a `conditions`
  property, which they don't anymore.

Then the keyword location that follows references was dropped, and every
schema and keyword evaluated on the same instance shares one location (see
"Plugins" in DESIGN.md). Measured back to back with the code before, twice
each, for JS values. FLAG didn't change (0.18–0.19 ms on the suite, three
times each).

| | Suite, before | Suite, after | tsconfig, before | tsconfig, after | OpenAPI, before | OpenAPI, after |
| --- | --- | --- | --- | --- | --- | --- |
| Hooks that do nothing | 0.48–0.66 ms | 0.46–0.49 ms | 1.60–1.65 ms | 1.33 ms | 1.65–1.86 ms | 1.47–1.57 ms |
| State for each schema and keyword | 0.52–0.58 ms | 0.50–0.52 ms | 1.81–1.99 ms | 1.51–1.60 ms | 1.84–2.09 ms | 1.67–1.74 ms |
| Reads every location | 0.49–0.54 ms | 0.47–0.50 ms | 1.74–1.87 ms | 1.44–1.46 ms | 1.74–1.93 ms | 1.56–1.60 ms |
| BASIC's plugin | 0.60–0.66 ms | 0.55–0.56 ms | 1.91–2.07 ms | 1.58–1.59 ms | 1.90–2.06 ms | 1.72–1.74 ms |

- On the suite's invalid instances, BASIC went from 0.58–0.61 ms to
  0.53–0.54 ms and DETAILED from 0.62–0.65 ms to 0.55 ms.
- One of the runs before drifted by more than 30% on the suite, so the
  real documents are the better comparison. They're 9–23% faster with
  plugins.
- Two other ways were tried first, as prototypes:
  - One location object for the whole evaluation, only valid during a
    hook, with pointers built from stacks when they're read. Hooks that do
    nothing were 12–21% faster, but BASIC's plugin wasn't. BASIC builds an
    error, reading both locations, for every failing keyword, and real
    schemas fail a lot in branches that pass (`anyOf` and `oneOf`
    alternatives, `if` conditions), so the pointers were built anyway.
    BASIC created 44,349 errors for the 3000 `package.json` files and kept
    76, 4,470 for `tsconfig.json` and kept none, and 1,582 for OpenAPI and
    kept one. Plugins would also have had to copy what they needed during
    the hook.
  - Recording integers in an `Int32Array` instead of calling hooks, for
    consumers to read afterwards. Just recording took 0.48 ms on the suite,
    slower than the first prototype with hooks that do nothing, before
    anything read the trace.

Taking an AST's instance locations from the nodes, which have them from
parsing, was tried next. Decoding a node's location every time a plugin
read it made a plugin that reads every location 25–80% slower on the
real documents, and BASIC's plugin slower too. Decoding only
locations that have a `%` brought it back to about even (back to back,
twice each, ASTs):

| | Before | After |
| --- | --- | --- |
| tsconfig, reads every location | 1.73–2.01 ms | 1.93–1.94 ms |
| tsconfig, BASIC's plugin | 1.92–2.09 ms | 2.00–2.09 ms |
| OpenAPI, reads every location | 2.27–2.28 ms | 2.45–2.50 ms |
| OpenAPI, BASIC's plugin | 2.32–2.38 ms | 2.34–2.37 ms |

Building the pointer by adding a segment at a time was already cheap, so
it wasn't kept.

Most of the errors BASIC creates are dropped, so creating only the ones
that are kept was considered. With locations cheap to read, the most it
could save is creating the error objects. Pushing one shared placeholder
instead of a new error, back to back, twice each, for JS values:

| | Errors | Placeholder |
| --- | --- | --- |
| 2020-12 suite | 0.505–0.509 ms | 0.491–0.516 ms |
| `tsconfig.json` | 1.485–1.492 ms | 1.447–1.449 ms |
| OpenAPI 3.0 | 1.591–1.637 ms | 1.605–1.629 ms |

- That's 0–3%, so it wasn't done.
- BASIC's plugin is still 10–19% slower than hooks that do nothing on
  the real documents. Its hooks are inlined into the evaluator, except
  cutting the list back, which was about 3% of the time. Writing that
  check out instead of calling a method made it 3–5% faster on
  `tsconfig.json` and 0–2% on OpenAPI, which wasn't worth repeating it in
  four places.

Plugins get every annotation through the `annotation` hook, so with
plugins, `annotate` is defined and keywords like `title` call it. That's a
call for 6% of keyword evaluations on OpenAPI, 15% on `tsconfig.json`, and
23% on `package.json` (117,664 for the 3000 files). It made no measurable
difference (back to back, twice each, JS values):

| | Before | After |
| --- | --- | --- |
| `package.json`, hooks that do nothing | 35.3–36.2 ms | 35.4–38.7 ms |
| `package.json`, BASIC's plugin | 42.9–46.0 ms | 42.2–44.4 ms |
| OpenAPI, hooks that do nothing | 1.51–1.57 ms | 1.48–1.49 ms |
| OpenAPI, BASIC's plugin | 1.69–1.77 ms | 1.73 ms |

## Bytecode and closures

A prototype in `benchmark/` (`claude/bytecode.ts`) lowers the IR once and then
turns it into either bytecode (one `Int32Array` run by an interpreter loop)
or closures with the same logic. Both only evaluate plain values in FLAG.
The lowered keywords are `type`, `const`, `enum`, `required`, the numeric,
length, and size bounds, `pattern`, `uniqueItems`, `properties`,
`patternProperties`, `additionalProperties`, `prefixItems`, `items`,
draft-04's `items` and `additionalItems`, `$ref`, `allOf`, `anyOf`, `oneOf`,
and `not`. Any other keyword is a call to its own evaluator. Schemas with a
keyword that reads evaluation state (`unevaluated*`, `$dynamicRef`) aren't
supported. It's compared with `Validator.validate` and with the
specialization for plain values called directly.

`bytecode.bench.ts` and `bytecode-polymorphic.bench.ts` (in `claude/`) use the
test suite. `corpus.bench.ts` uses real schemas: SchemaStore's `package.json` schema
with 3000 `package.json` files and its `tsconfig.json` schema with 196
`tsconfig.json` files (from `~/Projects`), the OpenAPI 3.0 schema with its
examples, and the draft-07 and draft-04 meta-schemas with every schema in
the test suite. `data/build-corpus.mjs` builds the corpora, which have
changed a little since. Every variant agrees
with v2 on every instance.

Real schemas (mean time per run of the corpus, FLAG):

| | `validate` | specialization | closures | bytecode | closures, no-ops dropped |
| --- | --- | --- | --- | --- | --- |
| `package.json` | 17.9 ms | 17.9 ms | 13.4 ms | 13.9 ms | 12.7 ms |
| `tsconfig.json` | 0.78 ms | 0.74 ms | 0.41 ms | 0.45 ms | 0.36 ms |
| OpenAPI 3.0 | 0.159 ms | 0.157 ms | 0.106 ms | 0.101 ms | 0.104 ms |
| draft-07 meta-schema | 0.137 ms | 0.126 ms | 0.100 ms | 0.103 ms | 0.088 ms |
| draft-04 meta-schema | 0.100 ms | 0.095 ms | 0.065 ms | 0.069 ms | 0.057 ms |

- Bytecode and closures are within about 10% of each other, and neither
  wins consistently. Closures were faster on four of the five corpora and
  on the test suite when every keyword was lowered. Bytecode was slightly
  faster when some keywords were calls, probably because it finds the
  instance's type once per schema, which closures could do too. Specialize
  keeps producing closures.
- Closures written for plain values were 1.25–1.8 times faster than the
  specialization, and about 1.65 times faster on the test suite (1.86
  times after evaluating ASTs).
- `Validator.validate` adds 15–20% on the test suite, whose instances are
  tiny, and 0–9% on real schemas.

Profiling the specialization on the real schemas found where the gap was.
`enum` compared every value with `instanceEqual`, `type` looked up a `Set`,
and the fastest schema evaluator checked for an AST on every call. `enum`
now looks up primitives in a `Set` and only compares arrays and objects,
`type` compares a single type directly, and plain values have their own
fastest schema evaluator, which is the keyword itself for a schema with
one keyword. The specialization compared with the closures:

| | Before | After |
| --- | --- | --- |
| `package.json` | 1.24× | 1.16× |
| `tsconfig.json` | 1.84× | 0.95× |
| OpenAPI 3.0 | 1.56× | 1.23× |
| draft-07 meta-schema | 1.29× | 1.06× |
| draft-04 meta-schema | 1.46× | 1.15× |
| v1 suite, every keyword lowered | 1.65× | 1.18× |
| v1 suite, after evaluating ASTs | 1.86× | 1.43× |

- Iterating an object's properties (`properties`, `additionalProperties`,
  `patternProperties`) is most of what's left in `package.json` and
  OpenAPI 3.0. For plain values, `properties` could look up its own names
  instead, but that's a linear search for each name in an AST, where it
  also behaves differently for duplicate names. Only a separate evaluator
  for plain values can do both.
- A generator for `jsInstance.entries` was 10–18% faster than
  `Object.entries` in a standalone script but 35–45% slower on
  `package.json` in the benchmark, so it isn't used.
- Results drift between sessions by more than some of these differences,
  so changes are compared by running the old and new code back to back.
- Most calls in real schemas are to keywords that always pass in FLAG
  (`description`, `default`, `title`, unknown keywords). Dropping them saves
  5–15%. The prototype lists them by hand.

## Optimizations

Measured with one-off scripts that time FLAG `validate` on the test suite
(every test case v2 gets right without remote schemas, test cases tagged
for `format` left out) and on the real-world corpora, comparing the code
before and after back to back (mean time per run, the median of 15–30).

Static `unevaluated*` (see "Optimizations" in DESIGN.md):

| | Before | After |
| --- | --- | --- |
| v1 suite | 0.195–0.208 ms | 0.164–0.173 ms |
| 2020-12 suite | 0.198–0.210 ms | 0.168–0.175 ms |
| draft-07 suite | 0.053 ms | 0.051–0.054 ms |
| `package.json` (draft-07) | 17.3–17.6 ms | 17.3–17.7 ms |

- It's about 15% faster on the v1 and 2020-12 suites, where
  `unevaluatedProperties.json` and `unevaluatedItems.json` were a third of
  the time. It resolves the `unevaluated*` keywords of 55 of the 70 2020-12
  test cases that have them. The rest depend on the instance (`anyOf`,
  `if`, `oneOf`, `dependentSchemas`, `contains`, `$dynamicRef`).
- The real schemas don't use `unevaluated*`, so they don't change.

Inlining `$ref` and `allOf`, with `package.json` and `tsconfig.json`
changed to 2020-12 so `$ref` is a keyword:

| | Before | After |
| --- | --- | --- |
| `package.json`, FLAG | 17.4–17.7 ms | 17.1–17.2 ms |
| `tsconfig.json`, FLAG | 0.570–0.580 ms | 0.557–0.558 ms |
| `package.json`, first `validate` | 7–8 ms | 13–15 ms |
| `package.json`, keywords | 10,032 | 13,405 |

- Compiling `package.json` takes 86 ms, and the pass took 6.6 ms, most of
  it copying and iterating the IR's schemas. Copying it with a spread
  takes 1.6 ms and `Object.keys` 0.5 ms. It isn't used.
- A CPU profile of FLAG on the draft-07 corpora: `jsInstance.entries`
  (`Object.entries`) is 35% of the time, `properties` 13%, and `type` 8%.


## Kernel prototype

A prototype of the kernel ([KERNEL.md](KERNEL.md)) is in
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

It's earlier and coarser than KERNEL.md. It lowers today's compiled values,
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

## Kernel prototype from the schema AST

A second prototype, in `benchmark/claude/kernel/`, is built on KERNEL.md's
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
  lint (see "Lowering for lint" below). `contradictory-limits.test.ts` is
  the rule's tests, run against the port, and `extra.test.ts` has a few
  more. They run with `npx vitest run benchmark/claude/kernel/`.

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
  non-object. Conditions now say their type (KERNEL.md, `cases`).
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

### Optimizing with plugins

`compare.ts` also evaluates with optimizations and plugins: merged matching
alone, and every optimization (`optimize.ts` with `dropGroups`, and merged
matching). Merged matching alone made the same hook calls as v2. With every
optimization, BASIC and DETAILED were the same as without, every result was
the same, and every trace was a subsequence of the unoptimized one. Making
merged matching always pass made 37 checks fail.

Plugin path only: the BASIC plugin on every instance, valid ones included.
BASIC output only uses it for instances that fail (1.4–3.2 times v2 on the
real schemas above, because most of their instances are valid). Results
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

### Lowering for lint

`lowerForLint` lowers a document without compiling or retrieving
(KERNEL.md, "Lowering for lint"). `lint-check.ts` compares what
`analysis.ts` finds from the expressions with lint's tables, on 1,483
documents (the corpora and the test suites, 12,783 keyword groups):

| | Same as the table | Different |
| --- | --- | --- |
| Types a keyword applies to (`keywordType`) | 12,054 | 583 |
| Asserts on its own (`const-or-enum-assertions`) | 12,756 | 27 |
| References (`visitReferences`) | 1,016 | 0 |

- Types leave out the 146 `format` keywords, whose types the table doesn't
  have. Every type that differs is a keyword with no effect in its schema,
  which applies to nothing: 543 unknown keywords that aren't annotations,
  16 `uniqueItems: false`, 14 `additionalItems` without an array `items`,
  6 `properties: {}`, and 4 `required: []`.
- The assertions that differ are the same `uniqueItems` and `required`, and
  7 `dependencies` with only arrays of names, which do assert on their own.
  The list leaves `dependencies` out because it can have schemas.
- References first missed 4, in `definitions`, which has no `lower`. Lint
  parses every keyword by its shape now.
- The port of `contradictory-limits` passed the rule's 16 tests, and gave
  the same messages as the rule on every document, none of which has
  contradictory limits, and on broken documents.
- Lowering a document took 0.7–1.7 ms for `package.json` and
  `tsconfig.json`, and about 7 µs for a test case's schema.

## The kernel in `src/`

`benchmark/claude/kernel/check-src.ts` checks `src/` against the last
commit before the kernel moved into it (a worktree at
`../json-schema-kernel-baseline`), on the corpora, the corpora changed to
2020-12, and the test suites. It checks `validate`, a restored validator,
annotations, BASIC, and DETAILED, and every hook call from an evaluator
built without optimizations. Through `Validator`, which optimizes for what
plugins can see, every hook call has to be one the baseline makes too, in
the same order. It found no differences, about 8 million hook calls. The
expected BASIC differences (58) are errors the baseline reports for
keywords the kernel says explain their failure (`conditional`,
`dependencies` with only schemas, `anyOf` and `oneOf` of one schema), and
BASIC is exactly the baseline's without them.

Results from 2026-10-24, one run on a quiet machine (baseline time divided
by `src/`'s, so more than 1 is faster; ranges are over a corpus and its
2020-12 version, or over the suites). BASIC output only runs its plugin on
instances that fail. "Every hook" is a plugin with every hook that does
nothing, on every instance.

| | FLAG | BASIC output | Every hook | First `validate` |
| --- | --- | --- | --- | --- |
| `package.json`, small | 1.64–1.80× | 1.57–1.64× | 0.95× | 0.82× |
| `package.json`, medium | 1.42–1.47× | 1.44–1.50× | 0.94–0.98× | 0.83–0.84× |
| `package.json`, large | 3.01–3.23× | 3.02–3.27× | 1.11× | 0.77–0.85× |
| `tsconfig.json`, small | 1.88–2.00× | 1.84–1.95× | 0.92–0.94× | 0.61× |
| `tsconfig.json`, medium | 1.32–1.36× | 1.54–1.57× | 0.85–0.86× | 0.62–0.84× |
| OpenAPI 3.0, medium | 1.99× | 1.92× | 1.03× | 0.88× |
| Test suites | 1.28–1.57× | 0.88–1.05× | 0.87–0.96× | 0.89–0.93× |

- FLAG and BASIC are faster on every real-world group. FLAG on the suites
  is faster than in the prototype (0.94–1.23×).
- BASIC on the suites, where most instances fail, is about the same as
  the baseline.
- `check-src.ts` times everything at the end of one long process, which
  has already evaluated ASTs, annotated, and run other plugins, so its
  "Every hook" is worse than in a process of its own.
- Its "First `validate`" isn't a fair comparison. `cases.ts` compiles every
  case with the baseline while loading them, so the baseline's compiling is
  already optimized by V8 when it's timed, and `src/`'s isn't. Timed round
  by round, `src/` takes 21–27 ms on small `tsconfig.json` files at first,
  and 12 ms, the same as the baseline, from about the 16th round on, so 7
  rounds catch it warming up. Measured fairly, `src/` takes 1.03–1.2 times
  as long, well within the 1.5 times the plan allowed. That was before the
  optimizer changes below, which made it 1.09–1.18 on these. Lowering
  each thing once (below) made `src/` faster than the baseline when both
  are warm (0.83–0.95 times as long), and about the same cold (0.93–1.05):

  | First `validate` | Cold, at first | Optimizer changes | Lowering once | Both warm, at first | Optimizer changes | Lowering once |
  | --- | --- | --- | --- | --- | --- | --- |
  | `tsconfig.json` | 0.84× | 0.88× | 0.95× | 0.87–0.89× | 0.91–0.92× | 1.05–1.10× |
  | `package.json` | 0.82× | 0.87× | 1.01× | 0.83–0.87× | 0.87–0.90× | 1.09–1.21× |
  | OpenAPI 3.0 | 0.86× | 0.88× | 1.08× | 0.86–0.88× | 0.85–0.89× | 1.21× |

  Cold is the very first compile in a fresh process, nothing compiled
  before (`cold-first-validate.ts`, median of 5 processes: 44.7 ms for the
  baseline on `tsconfig.json`, 53.0 ms for `src/`, then 50.7, then 48.3
  against 45.8 for the baseline). Both warm is `first-validate.ts` with
  `WARM_SRC=1`, which compiles every case with `src/` too, then alternates
  the two (median of 15 rounds).
- Evaluating with every hook was 0.77–0.93 times the baseline on most
  groups before `jsInstance` and `astInstance` were instances of classes.
  In a process of its own (`profile-src.ts`), `src/` was faster than the
  baseline, and only slower after the process had also evaluated ASTs.
  `instrumented.js` evaluates plain values and ASTs, and V8 shares type
  feedback between the closures it builds. The two instance operation
  objects were object literals with the same properties, so they had one
  hidden class, and a call like `ops.typeOf` that saw both had no known
  target. The profile showed `typeOf`, `value`, and `get` no longer
  inlined, and plain values with plugins got about 20% slower (1.35 to
  1.64 ms on small `tsconfig.json` files). With a class each, V8 inlines
  both. A second copy of `instrumented.js` for ASTs
  (`./instrumented.js?ast`) did about as well, but needed a module
  specifier with a query, which not every tool supports.

  | Every hook | Alone, before | After ASTs, before | Alone | After ASTs |
  | --- | --- | --- | --- | --- |
  | `tsconfig.json`, small | 1.33× | 0.99× | 1.36× | 1.26× |
  | `tsconfig.json`, medium | 1.22× | 0.94× | 1.21× | 1.06× |
  | `package.json`, small | 1.06× | 1.06× | 1.14× | 1.13× |
  | v1 suite | 0.98× | 0.85× | 0.98× | 1.01× |

  What's left after ASTs (about 10% on small `tsconfig.json` files) is the
  closures themselves seeing two kinds of instance, which only duplicating
  the code would avoid. Evaluating ASTs with plugins (`validateJson`) was
  the same or faster with the change (2.76 to 2.41 ms on the v1 suite).

`time-phases.ts` splits the first `validate` (per case, median of 7
rounds). Compiling is in a new session, so it includes retrieving and
resolving. Lowering is again in a session that has every document, so it's
lowering alone. Building is lazy, so it's timed with the first evaluation.

| | Compile | Lower | Optimize for FLAG | Build fast, first FLAG | Optimize and build with plugins, first evaluation |
| --- | --- | --- | --- | --- | --- |
| `package.json` | 59–71 ms | 15–20 ms | 4.4–8.1 ms | 7.4–9.8 ms | 13–25 ms |
| `tsconfig.json` | 9.4–9.8 ms | 1.3–1.4 ms | 0.72–0.75 ms | 0.64–0.73 ms | 1.4–1.6 ms |
| OpenAPI 3.0 | 6.7 ms | 1.6 ms | 0.54 ms | 0.66 ms | 1.2 ms |
| Test suites | 0.058–0.066 ms | 0.016–0.022 ms | 0.003–0.006 ms | 0.003–0.007 ms | 0.006–0.014 ms |

- Lowering was about 40% of compiling at first: 37–50 ms on
  `package.json`, 3.1–5.2 ms on `tsconfig.json`, 4.6 ms on OpenAPI 3.0.
  Most of it was parsing IRIs (`@hyperjump/uri`'s regular expressions)
  and browser's `get`, for the same few answers. Lowering `package.json`'s
  4,304 schemas called `session.get` 1,824 times for 133 different
  references, `getDialect` 3,840 times (normalizing the IRI three times
  each), and `toAbsoluteIri` for each schema's resource, of which there are
  11 (`count-lower.ts`). `Lowerer` now works each out once per lowering:
  the node a reference refers to, a dialect, and a resource's IRI, by the
  part of a location before the fragment. It caches the node, not the
  handle, because a reference to a schema that's still being lowered would
  wait on itself. Lowering alone (`profile-lower.ts`) went from 38 to
  15 ms on small `package.json` files, and it's about 25% of compiling now
  (one `tsconfig.json` group took 3.2 ms in one run, an outlier). What's
  left is spread out: lowering's own code, `await`s, garbage collection
  (15%), and browser's `get` for the 133 references (10%). The rest of
  compiling is retrieving, parsing, and resolving.
- Optimizing for FLAG took 6.7–10.7 ms on `package.json` and 1.0–1.1 ms on
  `tsconfig.json` at first, about as long as building the evaluator.
  `drop-groups` copied every schema with an annotation, which `fast.js`
  skips anyway (2.1 ms on `package.json`), so it only runs with plugins
  now, and the evaluator for ASTs without plugins skips them too.
  `fold-passing` rebuilt every schema and normalized every expression
  again, though only 290 of `package.json`'s 4,304 schemas change. Keeping
  what doesn't change took it from 4.1 to 3.4 ms.
- Most of what's left is iterating the kernel's `schemas`. An object with
  4,304 URIs as keys is in V8's dictionary mode: building a table of them
  with `for … in` takes 0.74 ms, and checking whether any group reads
  marks takes 1.0 ms, about the same with `readsMarks` written not to
  allocate. Each pass and evaluator that scans the kernel pays that.
  Building `fold-passing`'s table in a `Map` was slower (4.4 ms), because
  the kernel needs an object again afterwards.

### Evaluator and pass speedups

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

### One copy of the schemas, and what's read recorded when lowering

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

### Evaluating with plugins and annotating

Timings of a few percent drifted more than that between runs (10–15%), so
`benchmark/claude/ab/ab.ts` loads two copies of `src/` in one process and
alternates them round by round (`ab-setup.sh <rev>` makes the copies).
Two identical copies come out within 1%. B's time as a fraction of A's,
median of 21 rounds, HEAD against the changes:

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| Every hook: bit mask, `apply` without a closure | 0.987 | 0.950 | 0.986 |
| Every hook: and `cases` by type, `all` of two unrolled | 0.986 | 0.935 | 0.981 |
| Every hook: and locations built when read | 0.738 | 0.830 | 0.806 |
| A plugin that reads every location | 1.022 | 0.991 | 0.990 |
| Annotating | 0.981 | 0.978 | 0.992 |

- Building a JSON Pointer for every schema evaluated on a child was the
  biggest cost the evaluator had with plugins: not building them at all
  was 0.747–0.865 of the time.
- A CPU profile put 15% of evaluating `package.json` with every hook in
  `jsInstance.entries` (`Object.entries`). Looping over the object without
  allocating anything instead was no faster on `package.json` and 3–4% on
  the others, so the profile was counting the loop bodies V8 inlined into
  it, and it didn't change.
- Annotating spends about 35% converting the plain value to an AST
  (`fromJs` in `@hyperjump/browser`), half of that building node locations
  (`appendToLocation`, a JSON Pointer escape and an IRI check for every
  node), and 7% attaching annotations. The evaluator is about 30%.
  `validateJson` is mostly parsing.
- `@hyperjump/browser` now caches encoded segments in `appendToLocation`
  (up to 10,000 names of up to 100 characters), and appends array indexes
  without encoding them. Encoding was 16 of `fromJs`'s 25 ms on the
  `package.json` instances: checking each name for characters to encode
  cost about 46 ns a name, against 9 ns to concatenate, and only 7,453 of
  its 161,581 names are different. An A/B of the browser's two versions
  (the same way as `ab.ts`):

  | | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
  | --- | --- | --- | --- |
  | `fromJs` | 0.537 | 0.349 | 0.445 |
  | Parsing (`fromJson`) | 0.918 | 0.854 | 0.821 |
  | Indexes appended directly, after the cache | 0.932, 0.995 | 0.999, 0.999 | 1.031, 0.982 |

  Annotating small `package.json` files went from 12.6–14.5 to
  10.4–12.3 ms in separate runs; the other groups were within their
  noise.

### Property names in an object instead of a `Map`

A profile after the changes above still had the property loops as a third
of FLAG on `package.json` and `tsconfig.json`. Looking names up in an
object without a prototype instead of a `Map` (`ab.ts`, B/A):

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| FLAG | 0.906 | 0.780 | 0.968 |
| Every hook | 0.971 | 0.915 | 0.987 |
| Annotating | 0.996 | 0.958 | 1.002 |

- Probably because `for … in` gives names V8 has already internalized,
  and a property lookup with one is cheaper than `Map.get`. That wasn't
  checked.
- Annotating converts the value to an AST with `fromJs` and evaluates the
  AST, through `AstInstance`, whose `entries` is a generator and `get` a
  search. With the browser's cache, `fromJs` and its locations are still
  about a quarter of annotating `package.json`, and attaching annotations
  9–12%.
