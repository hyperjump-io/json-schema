# Evaluators

- `fast.js` evaluates plain values without plugins or annotations, which
  is `validate` with FLAG output, the most common call. It's written for
  plain values instead of reading them through `InstanceOps`. Sharing one
  implementation between plain values and ASTs made call sites
  polymorphic, and closures written for plain values were 1.06–1.23 times
  faster on real schemas (see [the benchmarks](../../benchmarks/README.md)). That was an
  open question before the kernel, because every keyword would have needed
  a second evaluator. Now it's one evaluator for each operation.
- `instrumented.js` evaluates everything else: with plugins, annotating,
  and ASTs (`validateJson`, `validateNode`). It reads instances through
  `InstanceOps` (`instance.js`), so it's written once for plain values and
  AST nodes. `jsInstance` and `astInstance` are instances of two classes,
  not object literals. Literals with the same properties share a hidden
  class, so `ops.typeOf` couldn't be inlined once both had been used,
  which made plain values with plugins about 20% slower in a process that
  also evaluated ASTs. `typeOf` is undefined for `json-missing` and `json-invalid`
  nodes, which pass every schema, and `has` is true for a property whose
  value is missing, so the syntax error is the only error for it.
- A schema's property operations are merged into one loop over the
  instance's properties. That's what makes real schemas faster than
  evaluating each operation on its own. Each property is matched once
  against the names, the patterns, and the `except` selectors, with
  `additionalProperties` being "nothing else matched", instead of testing
  them again. Merging is part of the evaluators, not a pass, because a
  merged loop isn't an expression. With plugins, only matching is merged
  (see [Plugins](plugins.md)).
- Arrays are evaluated the same way in `fast.js`. A schema's `typeIs` of
  only `array`, `itemCount`, and `eachItem` are one evaluator that tests
  whether the instance is an array once, and an `eachItem` whose item
  schema only checks the type checks it in the loop instead of calling
  it for each item. A call costs about as much as the check, so on arrays
  of numbers, like GeoJSON's coordinates, calls were most of the time
  ([Item loops](../../benchmarks/kernel-in-src/item-loops.md)). They aren't passes: the expression is the
  same, and only how `fast.js` runs it changes. `instrumented.js` can't
  merge them, because each group has its own hook calls.
- Evaluators depend on the instance representation, whether it's
  annotating, whether there are plugins, and whether one has an
  `annotation` hook, because that's what the optimizations depend on. Not
  on which plugins they are: plugins are often created for each call, so
  a cache keyed by plugin would miss every time. `validate` without
  options goes straight to the fast evaluator.
- Evaluation state (the instance location, the dynamic scope, the plugin
  and its state, annotations) lives in the evaluator's closure instead of
  being passed through every call. An evaluation started from inside
  another one, such as by a plugin, saves the outer one's state and
  restores it. The fast evaluator only tracks the dynamic scope.

The evaluators also choose how to evaluate an operation, which isn't a
pass, because it doesn't change the expression. `fast.js` checks more than
one type with a bit mask, calls two or three keyword groups (or an `all`
of two or three) without a loop, and builds `typeSwitch` as an array by
type, `propertySwitch` as a `Map` by value (which compares scalars as JSON
does), and `keySwitch` as a test for each property. `instrumented.js` does the same, except that it evaluates every
expression of an `all`, and an `apply` is the schema's evaluator without a
closure around it. The switches are operations, rather than `cases` the
evaluators recognize, so every evaluator gets the lookup, and lint can read
them. Lint only sees what keywords lower to, which the built-in keywords
never lower to a switch, but a keyword can, so lint's analyses know them:
what a switch applies to and can pass (a `typeSwitch`'s branch only for its
type, the others' only for objects), its effect, and the properties each
branch implies an object has or doesn't have. Both look property
names up in an object without a prototype rather than a `Map`, which was
faster, and no name is inherited, not even `__proto__`.
