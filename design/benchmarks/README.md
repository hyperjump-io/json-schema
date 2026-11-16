# Benchmarks

Measurements behind the performance decisions in [the design docs](../README.md),
one experiment per file, with the date it was first recorded.

Comparisons with other implementations are
[`jsonschema-benchmark`](https://github.com/sourcemeta-research/jsonschema-benchmark)'s
job, so its reports are what the entries compare with.

The benchmark code is in `benchmark/`:

- The A/B harness in `ab/` times two revisions of `src/` in one process
  (`ab.ts`) and checks that they give the same results (`ab-equal.ts`). It
  runs on real-world schemas and instances in `data/`, which aren't
  committed. They're built from files on one machine, most of them other
  projects' files. `CORPORA` gives it others.
- `npm run bundle-size` measures bundles of small entry scripts in
  `bundle-size/entries/`.

The rest was deleted on 2026-10-31, along with the worktrees it compared
with. That includes the scripts written for one-off investigations, the
benchmarks comparing v2 with v1 and other implementations
(`test-suite.bench.ts` and `real-world.bench.ts`), and `modes.bench.ts`. So
when an entry names one, it's saying how its numbers were measured, not
something that can be run.

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
  - [Unevaluated when annotating](kernel-in-src/unevaluated-when-annotating.md)
  - [Inlining and combining](kernel-in-src/combine.md)
  - [Reading a property's value first](kernel-in-src/property-values-first.md)
  - [String lengths without counting](kernel-in-src/string-lengths.md)
  - [The root without a wrapper](kernel-in-src/root-without-a-wrapper.md)
  - [Arrays of typed arrays](kernel-in-src/arrays-of-typed-arrays.md)
  - [One-case conditionals](kernel-in-src/one-case-conditionals.md)
  - [What the property loop doesn't do](kernel-in-src/property-loop-rejected.md)
  - [An `except` that selects every name](kernel-in-src/every-name.md)
  - [Index loops instead of iterators](kernel-in-src/index-loops.md)
  - [Plugin loops and schemas of one group](kernel-in-src/plugin-loops-and-one-group.md)
- [Bundle size](bundle-size.md) (2026-10-29)
- [Registry values](registry-values.md) (2026-11-10)
- [Building the flag evaluator first](flag-evaluator-first.md) (2026-11-10)
