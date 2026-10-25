# Plugins

First recorded 2026-10-21.

`benchmark/claude/plugin-cost.ts` times evaluating with plugins on the
2020-12 test cases v2 gets right (1290 instances), as a JS
value and as a JSON AST (`validateNode`). The plugins are an empty one,
one with hooks that do nothing, two of those, one that keeps a little state
for every schema and keyword, one that reads every location, and BASIC's.

Results (mean time per run of the suite, before and after the changes in
[Plugins](../components/kernel/plugins.md), measured in one session):

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

BASIC and DETAILED collect errors in one list now (see
[Output formats](../components/kernel/output-formats.md)). Measured back to back with the code before, twice each:

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
[Plugins](../components/kernel/plugins.md)). Measured back to back with the code before, twice
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
