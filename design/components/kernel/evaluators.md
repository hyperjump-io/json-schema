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
  An AST's `entries` is an array rather than a generator, which was
  4–21% faster with and without plugins
  ([Evaluating ASTs](../../benchmarks/kernel-in-src/evaluating-asts.md)).
  An AST without plugins or annotating stops early, like `fast.js`: a
  schema at its first failing group, `any` at the first subexpression that
  passes if nothing reads marks, and `eachItem` at the first item that
  fails. That was 5–29% faster. Nothing happens between one group and the
  next then, so a schema whose groups don't read marks is evaluated like
  `fast.js` evaluates it: as an `all` of its groups' expressions, with
  every property operation in one loop, a property schema that only checks
  the type checked in the loop with a mask, and its `typeIs` of `array`,
  `itemCount`, and `eachItem` as one evaluator. That made ASTs without
  plugins 31–47% faster. An item schema that only checks the type isn't
  checked in the loop, as it is in `fast.js`: that was slower on ASTs. The
  loops read an AST object's properties from its children, without
  `entries`, with or without plugins
  ([Evaluating ASTs](../../benchmarks/kernel-in-src/evaluating-asts.md)).
- A schema's property operations are merged into one loop over the
  instance's properties. That's what makes real schemas faster than
  evaluating each operation on its own. Each property is matched once
  against the names, the patterns, and the `except` selectors, with
  `additionalProperties` being "nothing else matched", instead of testing
  them again. Merging is part of the evaluators, not a pass, because a
  merged loop isn't an expression. With plugins, only matching is merged
  (see [Plugins](plugins.md)).
- In `fast.js`, a schema with a loop (two or more property operations;
  one is looked up by its name, which was faster than a loop over every
  property) also puts its `hasProperty`s and a `typeIs` of only `object`
  in it. A required name is counted when the loop gets to it, and the
  type is the loop's test of whether the instance is an object, so an
  object schema is one call instead of one for each group. Each name is
  looked up once, in a table of entries with the same shape, and a
  property schema that only checks the type is checked in the loop. An
  `except` that applies `false` (`additionalProperties: false`) fails any
  other name without a call. In `instrumented.js`, the matcher sets a bit
  for each required name the instance has (up to 30), and a `required`
  group, with its own hooks, reads its result from them instead of
  looking each name up again, which on an AST is a search of the object's
  properties. Bits count a name the JSON text has twice once
  ([Object loops](../../benchmarks/kernel-in-src/object-loops.md)).
  `fast.js`'s loops with an `except` read a property's value first,
  before anything that uses it. Reading it only where it's used made V8 12.9 and later
  (Node 23+) deoptimize the loop again and again
  ([Reading a property's value first](../../benchmarks/kernel-in-src/property-values-first.md)).
- Arrays are evaluated the same way in `fast.js`. A schema's `typeIs` of
  only `array`, `itemCount`, and `eachItem` are one evaluator that tests
  whether the instance is an array once, and an `eachItem` whose item
  schema only checks the type checks it in the loop instead of calling
  it for each item. A call costs about as much as the check, so on arrays
  of numbers, like GeoJSON's coordinates, calls were most of the time
  ([Item loops](../../benchmarks/kernel-in-src/item-loops.md)). They aren't passes: the expression is the
  same, and only how `fast.js` runs it changes. `instrumented.js` can't
  merge them, because each group has its own hook calls.
- `fast.js` compares plain values with its own `equal` instead of
  `instanceEqual`, which reads them through `InstanceOps`. `uniqueItems`
  compares every pair of a short array, and in a longer one only the
  items that could be equal: scalars are looked up in a set, arrays are
  compared with arrays of the same length, and objects with the objects
  with the same value of one property, the first object's first. Arrays
  of objects with names, like a project's plugins, were most of the time
  of SchemaStore's Unreal Engine `.uproject` schema
  ([Unique items](../../benchmarks/kernel-in-src/unique-items.md)). `instrumented.js` buckets them
  the same way, through `InstanceOps`, and compares with `instanceEqual`.
  An item that couldn't be parsed isn't in a bucket, because it isn't a
  duplicate of anything, and objects whose value for the property couldn't
  be parsed share the bucket for arrays and objects. That made the
  `.uproject` schema about twice as fast with plugins
  ([Evaluating ASTs](../../benchmarks/kernel-in-src/evaluating-asts.md)).
- Both evaluators look a scalar up in a set of `oneOfValues`'s scalars
  (`enum`), and only compare arrays and objects with each value. In
  `instrumented.js`, it made evaluating `tsconfig.json` files, which have
  enums of dozens of values, 14–19% faster
  ([Evaluating ASTs](../../benchmarks/kernel-in-src/evaluating-asts.md)).
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
  restores it. The fast evaluator only tracks the dynamic scope, and only
  for a kernel that reads it, so for most schemas it has nothing to save
  ([The root without a wrapper](../../benchmarks/kernel-in-src/root-without-a-wrapper.md)).

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
