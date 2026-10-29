# String lengths without counting

First recorded 2026-10-28.

After [Reading a property's value first](property-values-first.md), v2's
slowest corpora in `jsonschema-benchmark`, compared to the fastest other
implementation, were vercel (7.8 times corvus-ts) and aws-cdk (7.5 times).
A profile of vercel without inlining had `codePointLength` as 30% of FLAG
and `stringLength`'s evaluator as another 8%: its schema has 64
`maxLength`s and 12 `minLength`s, and every check counted the string's
code points. aws-cdk has one `minLength: 1`, on a property almost every
instance has, and counting was half of its time.

A string of n code units has from ⌈n/2⌉ to n code points, so
`codePointLengthIsWithin` fails one with fewer than `min` code units or
more than twice `max`, passes one with at most `max` code units and at
least twice `min`, and only counts the rest. `fast.js`,
`instrumented.js`, and the lint evaluator use it. In the container
(`node:23.7.0-alpine3.21`, ms for a run of the corpus once it has run 400
times):

| | Before | After |
| --- | --- | --- |
| vercel | 0.65 | 0.29 |
| aws-cdk | 0.057 | 0.028 |
| pulumi | 0.86 | 0.60 |
| cmake-presets | 6.8 | 5.8 |
| cypress | 0.100 | 0.070 |

On all 36 schemas, the geometric mean was 0.94 times, nothing else changed
by more than run-to-run noise, and validation results are the same on
every schema.

- Looking a property's entry up by its name's length, then with `===`
  among the names of that length (what corvus-ts's generated code does with
  a `switch`), instead of in an object without a prototype, made jshintrc
  (70 names) twice as slow and draft-04, OpenAPI, and cspell about 1.1
  times. It was faster only on helm-chart-lock (0.74) and, with this
  change, aws-cdk (0.028 to 0.025 ms), so it wasn't kept.
- corvus-ts is still about 1.7 times as fast on aws-cdk (17 ns an instance
  against 29, timed the same way). It generates code for each schema, with
  its type checks inline.
