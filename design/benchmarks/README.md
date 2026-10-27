# Benchmarks

Measurements behind the performance decisions in [the design docs](../README.md),
one experiment per file, with the date it was first recorded.

The benchmark code is in `benchmark/`, which isn't committed. It compares the
version checked out here with the other one, which it checks out in a
worktree next to this repo (see `benchmark/link.js`). The benchmarks in
`benchmark/benchmarks/` are kept up to date. The ones in `benchmark/claude/`
were written for one-off investigations.

- [Bytecode and closures](bytecode-and-closures.md) (2026-10-18)
- [Modes](modes.md) (2026-10-19)
- [Test suite](test-suite.md) (2026-10-21)
- [Real-world schemas](real-world-schemas.md) (2026-10-21)
- [Plugins](plugins.md) (2026-10-21)
- [Optimizations](optimizations.md) (2026-10-23)
- [Kernel prototype](kernel-prototype.md) (2026-10-23)
- [Kernel prototype from the schema AST](kernel-prototype-from-ast/README.md) (2026-10-23)
  - [Optimizing with plugins](kernel-prototype-from-ast/optimizing-with-plugins.md)
  - [Lowering for lint](kernel-prototype-from-ast/lowering-for-lint.md)
- [The kernel in `src/`](kernel-in-src/README.md) (2026-10-24)
  - [Evaluator and pass speedups](kernel-in-src/evaluator-and-pass-speedups.md)
  - [One copy of the schemas, and what's read recorded when lowering](kernel-in-src/one-copy-of-the-schemas.md)
  - [Evaluating with plugins and annotating](kernel-in-src/plugins-and-annotating.md)
  - [Property names in an object instead of a `Map`](kernel-in-src/property-names-in-an-object.md)
  - [Annotating the JS value instead of its AST](kernel-in-src/annotating-the-js-value.md)
  - [Dispatching by tag](kernel-in-src/dispatching-by-tag.md)
  - [Item loops](kernel-in-src/item-loops.md)
  - [Unique items](kernel-in-src/unique-items.md)
  - [Object loops](kernel-in-src/object-loops.md)
  - [Tags none of them require](kernel-in-src/tags-none-require.md)
  - [Resolving the dynamic scope](kernel-in-src/static-dynamic-scope.md)
  - [Evaluating ASTs](kernel-in-src/evaluating-asts.md)
