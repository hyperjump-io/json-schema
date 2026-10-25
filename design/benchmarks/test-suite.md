# Test suite

First recorded 2026-10-21.

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
  ASTs, because keyword code is shared (see [Compile and evaluate](../components/kernel/README.md)).
- Collecting errors (BASIC) is about 1.16–1.18 times slower than
  `@hyperjump/json-schema@1` in v1, about 1.29–1.31 times slower in draft-04,
  about 1.30–1.36 times slower in draft-06, about 1.24 times slower in
  draft-07, about 1.15–1.22 times slower in 2019-09, and about 1.12–1.16 times
  slower in 2020-12. It was about 5 times slower until errors stopped
  capturing stack traces (see [Validation API](../components/validation-api/README.md)).
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
  [Validation API](../components/validation-api/README.md)) took it to 1.16 ms, and the changes in
  "Plugins" to 0.76–0.79 ms. `benchmark/claude/errors-breakdown.ts`
  measures each part of collecting errors.
