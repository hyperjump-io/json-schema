# Reading a property's value first

First recorded 2026-10-28.

In `jsonschema-benchmark`, which runs Node 23.7.0 (V8 12.9), v2 took
0.67 ms on nest-cli in some runs and 1.3–1.46 ms in others, about 2.7
times what the same code takes on Node 22 (0.26 ms). It didn't settle:
it was still 0.7 ms after 400 runs of the corpus. stale,
semantic-release, lerna, code-climate, jsconfig, babelrc, deno, and
jshintrc were 1.5–2.7 times as slow on Node 23 too. `--trace-deopt`
showed `fast.js`'s property loop for `additionalProperties` deoptimized
663–806 times on nest-cli ("Insufficient type feedback for generic keyed
access"), at `instance[name]` in each arm of the ternary that checks a
property and at `entries[name]`. Node 22 deoptimized it none. Node 26
(V8 14.6) is the same as 23, so a newer Node doesn't fix it.

Reading `instance[name]` once, as the first statement of the `for … in`,
fixes it: 5 deopts on nest-cli. The loop for `patternProperties` and
`except`s already read it first, and `instrumented.js` reads properties
with `entries`, so neither deoptimizes. In the container
(`node:23.7.0-alpine3.21`, ms for a run of the corpus once it has run
400 times):

| | Before | After | Node 22, before |
| --- | --- | --- | --- |
| nest-cli | 0.70 | 0.26 | 0.26 |
| stale | 0.42 | 0.16 | 0.16 |
| semantic-release | 0.24 | 0.12 | 0.12 |
| code-climate | 0.42 | 0.24 | 0.22 |
| jshintrc | 1.18 | 0.87 | 0.76 |

On all 36 schemas, the 101st run (the one `jsonschema-benchmark` times)
was 0.497 to 0.411 ms (geometric mean) on Node 23, and 0.402 to 0.406 on
Node 22. Validation results are the same on every schema. In
`jsonschema-benchmark` itself, v2's geometric mean went from 0.34 to
0.28 ms.

- cypress is slower: 0.080 to 0.112 ms, the same in every run. In
  `for (const name in instance)`, V8 reads `instance[name]` by the
  property's slot in the object's enum cache, without its inline cache,
  unless the object misses that fast path. 7 of cypress's 981 instances
  are Minecraft recipes (`mekanism:sawing`, with `conditions` and
  `input`), whose names the schema doesn't have. They miss it, and now
  that every value is read, their reads make the read megamorphic
  (`--log-ic`), so the optimized loop reads every name generically.
  Before, a name the loop didn't know wasn't read. Without those 7,
  cypress is 0.08 ms before and after. Why they miss isn't known.
- Reading the value only for names the loop knows, in the matched branch
  or by skipping the others first, keeps cypress at 0.08 ms but brings
  the deopts back (615–786 on nest-cli). Looking `entries[name]` up
  through a function, or a `Map` for the entries, didn't fix them either.
- `Object.keys` in place of `for … in` fixed them, but it was 1.1–1.45
  times as slow on most other schemas, on Node 22 and 23, because it
  makes an array for each object.
