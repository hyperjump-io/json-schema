# The kernel

The specification of the kernel, implemented in `src/kernel/`. How it's
implemented is in [Compile and evaluate](../../components/kernel/README.md),
and its measurements are in [the benchmarks](../../benchmarks/README.md).

The kernel is a small language that every keyword lowers to. A keyword says
what it means as kernel expressions, and the kernel knows what every
expression means. The optimizer, the linter, and the output formats only work
with kernel expressions, so they support any keyword that lowers to them,
including user-defined ones, without knowing its URI.

It replaced `compile` and `evaluate` in the keyword interface. Before the
kernel, a keyword compiled to an opaque JSON value and evaluated through an
opaque closure, so everything that needed to know what a keyword means had
a table of keyword URIs: the passes (`static-unevaluated.js`), lint
(`keywordType`, `assertionUris`, `contradictory-limits`' pairs), and the
output formats (`if` and `conditional` in `output/utilities.js`).

Two prototypes came first ([Kernel prototype](../../benchmarks/kernel-prototype.md) and "Kernel
prototype from the schema AST"). The implementation was checked against
the code before it on the real-world corpora and the test suites: the same
results, annotations, and output, except where this specification changes
BASIC, and the same hook calls without optimizations ("The
kernel in `src/`").

## Principles

- **An operation states one fact about the instance, not a step of an
  algorithm.** "Every property matching `^x-` is valid against S" is a
  fact. "Loop over the properties" isn't. Iteration and branching are part
  of what an operation means, never operations of their own. Lint and the
  passes depend on knowing what an operation means.
- **Small operations.** A keyword that says several things lowers to
  several operations (`required: ["a", "b"]` is two `hasProperty`). That
  gives the optimizer and lint more to work with. Evaluating each operation
  on its own would be slow, so merging them (like a schema's property
  operations into one loop over the properties) is the optimizer's job, and
  it isn't optional.
- **One meaning, one form.** Where two forms say the same thing, one is the
  normal form, and a pass rewrites the other to it before anything else
  (see [Normal form](normal-form.md)).
- **The kernel knows meaning, keywords declare syntax.** Where a keyword's
  value has schemas (`shape`) and which siblings it reads (`siblings`) are
  about the document. They're needed before lowering, on documents that may
  be broken, by tools that never lower. So they stay declared, and they're
  what `lower` gets as input. Everything about meaning comes from the
  expressions.
- **Expressions are JSON**, so a compiled schema can still be serialized.
- **Escape hatches are explicit.** A keyword that can't be said with the
  kernel's operations uses `predicate` (a check) or `opaque` (an
  applicator). Those are supported, but the optimizer and lint can see less
  of them.

## Contents

- [Evaluation model](evaluation-model.md)
- [Schemas and keyword groups](schemas-and-groups.md)
- [Operations](operations/README.md)
- [Normal form](normal-form.md)
- [Optimizer](optimizer.md)
- [Every keyword](every-keyword.md): what each built-in keyword lowers to
- [Lowering for lint](lowering-for-lint.md)
- [Evaluating for lint](evaluating-for-lint.md)

The keyword interface is in [Keywords](../keyword/README.md).
