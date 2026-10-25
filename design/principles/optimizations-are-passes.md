# Optimizations are passes

A rewrite of what's evaluated is a pass in `src/kernel/optimizations/`, not
a decision made while building one evaluator, so every evaluation strategy
gets it, including ones that don't exist yet (see
[Optimizations](../components/kernel/optimizations/README.md)).

- A rewrite is said with kernel operations. Type and tag dispatch are
  `typeSwitch`, `propertySwitch`, and `keySwitch`, operations every
  evaluator can look up, and lint can read, rather than shapes of `cases`
  one evaluator recognizes.
- How an evaluator runs one operation stays in the evaluator: a bit mask
  for `typeIs`, unrolled loops, a merged property loop (which isn't an
  expression).
- A pass has to save more than it costs. Iterating a large kernel isn't
  free, and the first `validate` pays for every pass.
