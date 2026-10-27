# Evaluation state

Cross-cutting keywords don't use plugins. v1 implemented `unevaluated*` and
`$dynamicRef` as plugins, which put every evaluation through hook wrappers.
Here, evaluators track two kinds of state, each only when an expression in
the kernel reads it:

- **Marks**: the properties or items evaluated at an instance location.
  The operations that evaluate properties or items (`property`,
  `eachProperty`, `item`, `eachItem`, `contains`, `itemSequence`) mark
  them, and an `unevaluated` selector reads them (`readsMarks`). A group
  with an `unevaluated` selector is evaluated after the groups that don't
  have one, so it sees what they marked. That replaces v1's hard-coded
  keyword order. Objects and arrays share one set because an instance
  can't be both. This is a built-in set rather than a general way for
  keywords to read each other's annotations, which would make every reader
  understand every producer's annotation format.
- **The dynamic scope**: `dynamicApply(anchor, fallback)` applies the
  outermost schema in the dynamic scope with that dynamic anchor. Evaluators
  update an anchor-to-handle map when evaluation enters a different schema
  resource, reusing the outer map when the resource adds nothing. 2020-12's
  bookending and 2019-09's `$recursiveAnchor` are decided when lowering,
  from the dynamic anchors of the resource a reference resolves to, so a
  reference that doesn't use the dynamic scope is a plain `apply`, and
  `dynamicApply` has no dialect rules. Lowering a schema in a resource also
  lowers that resource's dynamic anchor targets, because evaluation can't
  retrieve anything. They're recorded before they're lowered, so a
  reference lowered meanwhile, like `meta/core`'s `$dynamicRef` to its own
  `"meta"` anchor, sees every one.
  [`static-dynamic-scope`](optimizations/static-dynamic-scope.md) usually
  resolves every `dynamicApply` from the entry, and the evaluators don't
  track the dynamic scope.

Marks follow the same rule as annotations: an operation's marks are kept
only if it passes. A subexpression's marks on the same instance are its
parent's. Marks made on a property or item are about that child, so they
never reach the parent. Marks are demand-driven: an evaluator gets the set
to mark in, or nothing if nothing reads what it marks. A schema with a
group that reads marks starts its own set and adds it to its caller's if it
passes. An operation whose subexpressions can fail without it failing
(`any`, `one`, a condition of `cases`) gives each one its own set and keeps
the ones that pass. In `instrumented.js`, which evaluates a schema's
groups between their own hooks, each group gets its own set too. An
expression that can't mark the instance (one without property or item
operations, or a schema that applies only such expressions) gets no set,
one that marks gets an empty set, and only one that reads marks gets a
copy of what's marked so far. Copying for every group was 6–9% of
evaluating OpenAPI 3.1 documents with plugins
([Evaluating ASTs](../../benchmarks/kernel-in-src/evaluating-asts.md)).

Because only passing expressions keep marks, an evaluator can always stop
at a failure. Without plugins or annotations, `any` stops at the first that
passes unless its marks are read, `one` at the second, and `contains` at
its minimum. `opaque`'s `context.exhaustive` says when a keyword can't stop
early.

Annotations follow the spec: they're kept only if the keyword and every
schema they were evaluated through pass. An invalid instance gets no
annotations from the failing parts of the schema. The language server has its
own annotation implementation for that reason. Plugins see every
annotation, including the ones that aren't kept (see [Plugins](plugins.md)). Annotations
are collected in one flat list for the evaluation. A schema that fails
cuts the list back to its length when the schema started, which drops
what its groups and the schemas they applied added, and a schema fails if
any of its groups fails. What's left is attached to the instance's nodes
at the end. That was 14–23% faster than nested lists for each group and
schema ([Evaluating ASTs](../../benchmarks/kernel-in-src/evaluating-asts.md)).
