# Compile and evaluate (`src/kernel/`)

Keywords lower to the kernel, a small language of operations that the
optimizer, the output formats, and lint understand. [the kernel spec](../../specs/kernel/README.md)
specifies it: the operations, the normal form, what the optimizer may do,
and what every keyword lowers to. This section is about how it's
implemented. Requirements: fast on plain JS values, exact error locations,
and extensibility (user keywords and plugins can run arbitrary code) can't
be traded away for speed.

There are two phases:

1. **Lower** (async, once per `Validator`, `lower.js`). Walk the schema AST
   from the entry URI, retrieving referenced schemas with `get`. Each
   keyword's value is parsed by its shape, with the schemas in it compiled,
   and given to its `lower` with the siblings it declares. The result is a
   `Kernel`: a table of handles (canonical URIs) to a boolean or the
   schema's keyword groups, and the dynamic anchors of every resource.
   Schemas refer to each other by handle, so cycles are fine. Expressions
   are in the normal form (`normalize.js`). All I/O happens here.
2. **Build evaluators** (sync, lazy). The kernel is optimized for what an
   evaluation can observe (see [Optimizations](optimizations/README.md)) and turned into closures.
   Each evaluator is built the first time it's needed and cached on the
   `Validator`. No `eval`. Bytecode run by one interpreter loop was tried
   instead of closures and wasn't faster (see
   [the benchmarks](../../benchmarks/README.md)).

The kernel is JSON, so a compiled schema can be serialized
(`Validator.serialize`, `JsonSchema.restoreValidator`). It's serialized as
lowered, before any optimization. It has `kernel: 1`, and
`restoreValidator` rejects any other version. Restoring also looks up every
keyword, asserting format, and escape hatch's `evaluate` the kernel needs,
so a definition that's missing from the `JsonSchema` fails there, not on
the first evaluation.

`validateJson` and `annotateJson` parse with browser's error-tolerant
`fromJson` and then evaluate the AST. Validating while parsing is a possible
optimization later. The two phases don't rule it out.

## Contents

- [Evaluators](evaluators.md)
- [Optimizations](optimizations/README.md)
- [Evaluation state](evaluation-state.md): marks and the dynamic scope
- [Plugins](plugins.md)
- [Output formats](output-formats.md)

What a keyword does when it lowers is in [`lower`](../../specs/keyword/lower.md).
