# Optimizations that were tried and aren't used

- Inlining the schemas `$ref` and `allOf` apply (their keywords in place of
  the keyword), before the kernel, saved about 3% on `package.json` as
  2020-12, where `$ref` is a keyword, and nothing on the test suite. It
  made the first `validate` about twice as slow (7 to 13–15 ms), half in
  the pass and half in building the 34% more keywords it copies, so it
  would take about 65,000 validations to make that back. Inlining in the
  kernel, without plugins, is [`combine`](combine.md), which costs much
  less and is worth much more without `annotate`.
- Finding the instance's type once per schema and only evaluating the
  operations for that type was up to 18% slower.
- Annotating a JS value by evaluating the value instead of its AST
  (`fromJs` still makes the AST to return), recording each annotation's
  location and finding its node in the AST afterwards, was 7–8% slower on
  `package.json` and `tsconfig.json` and 6% faster on OpenAPI 3.0. Real
  schemas annotate almost every value (a `description` on each property),
  so nearly every annotation needs its node found, which evaluating the
  AST gets for free, and a location is made for every value evaluated.
- Choosing by type in an `any` whose schemas aren't only a `type` was
  slower: it already stops at the first that passes. So was choosing in a
  `one` where a type still has more than one schema, or looking the type
  up by name instead of by index.
- Making a `one` whose expressions all exclude each other an `any`, in
  `fast`, so it stops at the first that passes. `dispatch` already leaves
  a `one` only what can pass the instance's type or tag, so it was about
  1% on `cql2` and nothing on the other corpora, and the pass cost 0.4–3.6
  ms when an evaluator is built
  ([An exclusive `one` as `any`](../../../benchmarks/kernel-in-src/exclusive-one.md)).
