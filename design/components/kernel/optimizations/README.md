# Optimizations (`src/kernel/optimizations/`)

Each optimization pass is a file in `src/kernel/optimizations/`, so what
the optimizer can do and where each pass is implemented can be seen from the
file structure, like keywords and dialects. `optimizations/index.js` lists
them, and `src/kernel/optimize.js` runs them.

- A pass is an `Optimization`: `{ optimize(kernel, mode) }`. The mode is
  what the evaluation can observe: `fast` (no plugins and no annotations,
  so only the result and the marks matter), `plugins`, and `annotations`
  (annotating, or a plugin with an `annotation` hook). A pass returns the
  schemas it replaces, by handle (or `null` for one it removes, which
  nothing left in the kernel applies), and doesn't change the kernel it's given,
  because the `Validator` keeps it for its other evaluators and for
  `serialize`. `optimize` puts what each pass replaces in one copy of the
  kernel's schemas, made the first time a pass replaces anything, and
  later passes get that copy. A kernel that no pass changes isn't copied.
- The kernel's `reads` lists the schemas with a keyword group that reads
  marks (`evaluated`) or the dynamic scope (`dynamicScope`). Lowering
  records it, `optimize` keeps it right for the schemas passes replace,
  and `restoreValidator` works it out again rather than trusting it. So
  "does anything read marks?" isn't a walk over every expression, which
  took 1.7–2 ms on `package.json` each time a pass or evaluator asked, and
  `static-unevaluated` only looks at the schemas that read marks.
- Passes run when an evaluator is built, for its mode, so a serialized
  kernel isn't optimized for any one mode.
- Passes run in the order `index.js` lists them, because one can leave work
  for another, like `static-unevaluated` leaving a schema whose marks
  nothing reads, which folding can then fold, or `static-dynamic-scope`
  leaving an `apply` where `static-unevaluated` can see what's marked. Unlike keywords, they aren't
  independent.
- Passes only know operations, never keywords, so any keyword that lowers
  to the kernel's operations is optimized like the built-in ones. Before
  the kernel, a pass had rules for keyword URIs. `opaque` is a barrier:
  nothing is folded inside it, and what it marks is unknown.
- With plugins, what plugins see can depend on the optimizations, but it's
  never wrong ([Optimizer](../../../specs/kernel/optimizer.md)). A schema that always passes might
  not be evaluated as a schema of its own, and a keyword that only
  annotates is left out for plugins without an `annotation` hook. Each hook
  call is still about what it says.
- Passes aren't part of the API. There's no `addOptimization`.
- A pass over a large kernel isn't free. Copying or iterating the 4,304
  schemas of SchemaStore's `package.json` schema takes 0.5–1.6 ms, because
  an object with that many keys is in V8's dictionary mode, so a pass
  only returns what it changes, and a pass has to save more than it costs (see
  "Optimizations" and "The kernel in `src/`" in
  [the benchmarks](../../../benchmarks/README.md)).

## Passes

In the order they run:

- [`static-dynamic-scope.js`](static-dynamic-scope.md)
- [`static-unevaluated.js`](static-unevaluated.md)
- [`fold-passing.js`](fold-passing.md)
- [`dispatch.js`](dispatch.md)
- [`drop-groups.js`](drop-groups.md)

[Optimizations that were tried and aren't used](rejected.md) are kept so
they aren't tried again without a new reason.
