# Benchmarks

Measurements behind the performance decisions in [DESIGN.md](DESIGN.md).
The benchmark code is in `scratch/bench`, which isn't committed. The
benchmarks in `benchmarks/` are kept up to date. The ones in `claude/` were
written for one-off investigations.

## Test suite

The benchmark (`benchmarks/test-suite.bench.ts`) is ported from
`@hyperjump/json-schema`'s. It compares implementations over the v1 test cases of the
JSON-Schema-Test-Suite, and over the draft-04, draft-06, draft-07, 2019-09,
and 2020-12 test cases, which json-schema-next evaluates with those presets.
ata-validator doesn't support draft-04, so it isn't in that comparison. Test
cases tagged for `format` are left out. A test case that any implementation
gets wrong is left out for every implementation. In those drafts,
json-schema-next only gets the two `file:` identifier test cases wrong, which
it rejects on purpose. In draft-04 through draft-07, `@hyperjump/json-schema`
also gets two legacy identifier test cases wrong. Every implementation runs
with `format` validation off. The results in the first table were measured
when json-schema-next and `@hyperjump/json-schema` still validated draft-04
through draft-07 formats, which didn't matter, because the untagged test cases
only use `format` on values that aren't strings, which `format` skips.

The first table and its notes are from early on, before errors and plugins
got faster. Only 2020-12 is enabled in the benchmark now.

Results (mean time per run of the suite, FLAG unless it says errors):

| | json-schema-next | `@hyperjump/json-schema` |
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

- FLAG is about 2.7–2.9 times faster than `@hyperjump/json-schema` in v1,
  about 2.5 times faster in draft-04, about 2.4 times faster in draft-06 and
  draft-07, about 2.7 times faster in 2019-09, and about 2.85 times faster in
  2020-12.
- `validate` is about 15% slower in a process that has also evaluated
  ASTs, because keyword code is shared (see "Compile and evaluate" in DESIGN.md).
- Collecting errors (BASIC) is about 1.16–1.18 times slower than
  `@hyperjump/json-schema` in v1, about 1.29–1.31 times slower in draft-04,
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
  errors. It's about 14 times faster than json-schema-next in draft-04, about
  10 times faster in draft-06 and draft-07, about 6.8–7.3 times faster in
  2019-09, and about 4.6–4.7 times faster in 2020-12.
- With the `format` test cases, format validators take most of the time,
  and FLAG is only about 1.4 times faster.

Every implementation in 2020-12, measured on 2026-10-21 (mean time per run
of the suite):

| | FLAG | All errors |
| --- | --- | --- |
| json-schema-next | 0.243 ms | 0.785 ms |
| `@hyperjump/json-schema` | 0.912 ms | 1.668 ms |
| `@corvus-dotnet/json-schema` | 0.058 ms | 0.863 ms |
| ata-validator | 0.061 ms | 1.124 ms |
| `@exodus/schemasafe` | 0.081 ms | 0.353 ms |

- corvus and ata-validator, which both generate code, are about 4 times
  faster than json-schema-next at FLAG, and schemasafe is about 3 times
  faster. json-schema-next is about 3.75 times faster than
  `@hyperjump/json-schema`.
- At collecting errors, only schemasafe is faster, about 2.2 times.
  json-schema-next is faster than corvus, ata-validator, and
  `@hyperjump/json-schema` (2.1 times). 41% of the suite's instances are
  invalid.
- How it got there: json-schema-next was the slowest at collecting errors
  (1.83 ms), when errors were `VFileMessage`s with a message built for each
  one. Plain objects without messages (see "Validation API" in DESIGN.md)
  took it to 1.16 ms, and the changes in "Plugins" to 0.78 ms.
  `scratch/bench/claude/errors-breakdown.ts` measures each part of
  collecting errors.

## Real-world schemas

`benchmarks/real-world.bench.ts` compares implementations the same way on
real schemas: SchemaStore's `package.json` schema (draft-07) with 3000
`package.json` files, its `tsconfig.json` schema (draft-07) with 194
`tsconfig.json` files (both from `~/Projects`), and the OpenAPI 3.0 schema
(draft-04) with its examples and two more OpenAPI documents, one of them the
335 KB openEO API. `data/build-corpus.mjs` builds the corpora. Instances are
grouped by the size of their JSON text: small (under 1 KB), medium (1–10 KB),
and large (10 KB or more). Instances don't have an expected result, so an
instance is left out if the implementations don't all agree on it. With
`format` validation off, they agree on every one. ata-validator doesn't
support draft-04, and schemasafe can't compile the `package.json` or
OpenAPI schemas when it collects errors.

Results from 2026-10-21 (mean time per run of the group, in ms):

| FLAG | Instances | json-schema-next | `@hyperjump/json-schema` | corvus | ata-validator | schemasafe |
| --- | --- | --- | --- | --- | --- | --- |
| `package.json`, small | 1472 | 1.97 | 6.80 | 0.403 | 10.4 | 4.27 |
| `package.json`, medium | 1514 | 8.42 | 24.9 | 2.03 | 22.9 | 12.7 |
| `package.json`, large | 14 | 1.06 | 2.47 | 0.146 | 0.236 | 0.433 |
| `tsconfig.json`, small | 191 | 0.313 | 1.24 | 0.039 | 2.46 | 0.879 |
| `tsconfig.json`, medium | 3 | 0.0112 | 0.0482 | 0.0015 | 0.0041 | 0.0183 |
| OpenAPI 3.0, medium | 6 | 0.108 | 0.337 | 0.0195 | | 0.111 |
| OpenAPI 3.0, large | 1 | 0.379 | 1.61 | 0.0828 | | 0.589 |

| All errors | Instances | json-schema-next | `@hyperjump/json-schema` | corvus | ata-validator | schemasafe |
| --- | --- | --- | --- | --- | --- | --- |
| `package.json`, small | 1472 | 2.37 | 10.1 | 12.2 | 11.3 | |
| `package.json`, medium | 1514 | 9.66 | 45.2 | 50.4 | 24.9 | |
| `package.json`, large | 14 | 1.07 | 4.36 | 3.65 | 0.237 | |
| `tsconfig.json`, small | 191 | 0.341 | 2.60 | 2.90 | 2.51 | 0.963 |
| `tsconfig.json`, medium | 3 | 0.0114 | 0.105 | 0.119 | 0.0040 | 0.0202 |
| OpenAPI 3.0, medium | 6 | 0.109 | 0.627 | 0.507 | | |
| OpenAPI 3.0, large | 1 | 0.380 | 2.89 | 1.84 | | |

- json-schema-next is faster than `@hyperjump/json-schema` on every group:
  2.3–4.3 times at FLAG and 4.1–9.2 times at errors.
- corvus is the fastest at FLAG on every group, 4.2–8 times faster than
  json-schema-next. The gap is 4–5 times on small and medium `package.json`
  files and about 7 times on large ones, so json-schema-next falls further
  behind as instances get bigger.
- The test suite makes json-schema-next look worse at FLAG than these
  schemas do. ata-validator and schemasafe are 3–4 times faster on the
  suite, but json-schema-next is faster than both on small and medium
  `package.json` files and small `tsconfig.json` files, and about the same
  as schemasafe on the medium OpenAPI documents. They're 2.5–4.5 times
  faster on large `package.json` files, and ata-validator is faster on the
  three medium `tsconfig.json` files. ata-validator takes about 7–17 µs for
  each `package.json` file whatever its size, so it's slow on many small
  instances and fast on big ones.
- Almost every instance is valid (35 of the 3000 `package.json` files fail,
  and none of the others do), so the errors results are mostly the cost of
  being ready to collect errors. json-schema-next only collects errors on a
  second evaluation of an invalid instance, so its errors cost at most
  about 1.2 times its FLAG here. corvus's results collector costs 25–75
  times its FLAG even when there's nothing to report, which is why
  json-schema-next is the fastest at errors on most groups.
  ata-validator's errors cost the same as its FLAG, so it's fastest on
  large valid instances.
- The `tsconfig.json` medium and OpenAPI groups have only a few instances,
  so they mostly show how those documents do. The one small OpenAPI
  document is left out of the tables. It's invalid at the root, so it only
  times how fast each implementation fails.

## Modes

`benchmarks/modes.bench.ts` times every mode of a
`Validator` against the others, without other implementations. It runs on
the v1 test cases json-schema-next gets right. Each instance is a JS value,
its JSON text, or a JSON AST built from it with browser's `fromJs` before
the timed part. Annotating a node adds to the annotations already on it, so
`annotateNode` gets new nodes before each run, which isn't timed. Error modes
go through every error.

Results from 2026-10-21 (mean time per run of the suite, the range over
four runs):

| Mode | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| FLAG | 0.21–0.22 ms | 2.27–2.72 ms | 0.33–0.35 ms |
| BASIC | 0.72–0.74 ms | 3.00–3.43 ms | 0.88–1.02 ms |
| DETAILED | 0.73–0.82 ms | 3.15–3.66 ms | 0.88–1.01 ms |
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

`scratch/bench/claude/plugin-cost.ts` times evaluating with plugins on the
2020-12 test cases json-schema-next gets right (1290 instances), as a JS
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
- `scratch/bench/claude/output-equivalence.ts` checks that the output is
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

A prototype in `scratch/bench` (`claude/bytecode.ts`) lowers the IR once and then
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
with json-schema-next on every instance.

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

## CLI workspace registry

The CLI's registry has every schema file in the working directory (see "CLI"
in DESIGN.md). This times `jsonschema` linting one file in a generated
workspace of 3000 schema files (12 MB, 2020-12, each with an `$id`, 20
properties, and `$defs`) in 50 folders. "Plain" is a v1 schema, which never
looks anything up. "Custom" has a custom meta-schema found by its `$id`, so
the registry is indexed. The workspace generator isn't committed. Times are
wall clock for the whole command, including Node.js starting, which is
about 0.19 s in an empty folder.

| | Plain | Custom |
| --- | --- | --- |
| Before | 0.57–0.60 s | 0.53–0.57 s |
| Indexing when a session first looks something up | 0.38–0.45 s | 0.56–0.62 s |
| Identifying entries with `JSON.parse` | 0.37–0.39 s | 0.50–0.57 s |
| Reading files concurrently | 0.29–0.34 s | 0.34–0.36 s |

- Before, indexing took about 180 ms, and parsing every entry into a JSON
  AST with positions was about 160 ms of that. Only `$schema` and the root
  keywords with resolve hooks are needed to identify an entry. With
  `JSON.parse`, and nodes only for those keywords, indexing took about
  60 ms. An entry with a problem is parsed again into a tree, so the
  message has a position.
- Every session indexed its registries when it was created, though
  DESIGN.md said a registry is indexed the first time a session uses it. Now
  it is, so a lint that never looks anything up doesn't index.
- Searching the folders and reading the files one at a time spent most of
  its time waiting. Reading 64 at a time, and searching folders at the same
  time, took the rest down to about 0.1–0.15 s more than an empty folder.
- About 50 ms of what's left is `unified-args` loading `yaml` and `chokidar`.
