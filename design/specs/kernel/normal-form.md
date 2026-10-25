# Normal form

A pass rewrites expressions to their normal form before anything else, so
lint, the other passes, and evaluation with or without plugins only see one
form of each meaning. What may change, and what may not:

1. **A rewrite never changes** the result, the marks, or the annotations.
2. **A normal-form rule can change what's derived from expressions**, like
   whether a keyword explains its failure, and so what an output format
   reports. It always applies, so the output is still the same for every
   evaluation. Such a change is a change in the output, so it needs a new
   kernel version.
3. **Hook calls can depend on optimizations** (see [Optimizer](optimizer.md)), but never
   be wrong.

The rules so far:

- `all` and `any` in themselves are flattened, and `all` of one is the one
- `any` of one is the one. Both explain their failures, so BASIC reports
  the same, without the `anyOf` error that only said its schema failed.
- `oneOfValues` of one value is `equals`
- `typeIs` with no types is `fail`
- `pass` in `all` is dropped, and `fail` in `any` is dropped
- Limits that always pass are dropped: a count's `min: 0`, and
  `exclusiveMin` or `exclusiveMax` that's `false` or has no limit to go
  with. `range`, `stringLength`, `itemCount`, or `propertyCount` without
  limits is `pass`. A keyword then has the same expression with its
  default value as without it. `contains` with `min: 0` stays, because it
  marks what passes.
- A rule has to keep what the expression applies to. `range` with equal,
  inclusive limits isn't `equals`, because `range` passes every string and
  `equals` doesn't, so it stays a `range`.
