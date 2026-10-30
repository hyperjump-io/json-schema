# Compile and evaluate (`src/kernel/`)

Keywords lower to the kernel, a small language of operations that the
optimizer, the output formats, and lint understand. [the kernel spec](../../specs/kernel/README.md)
specifies it: the operations, the normal form, what the optimizer may do,
and what every keyword lowers to. This section is about how it's
implemented. Requirements: fast on plain JS values, exact error locations,
and extensibility (user keywords and plugins can run arbitrary code) can't
be traded away for speed.

There are two phases:

1. **Lower** (async, once per compiled schema, `lower.js`). Walk the schema AST
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
   compiled schema (`Validator`, which isn't exported). No `eval`. Bytecode run by one interpreter loop was tried
   instead of closures and wasn't faster (see
   [the benchmarks](../../benchmarks/README.md)).

The kernel is JSON, so a compiled schema can be serialized
(`serialize` and `restore`). It's serialized as
lowered, before any optimization. It has `kernel: 1`, and
`restore` rejects any other version. Restoring also looks up every
keyword, asserting format, and escape hatch's `evaluate` the kernel needs,
so a definition that's missing from the `JsonSchema` fails there, not on
the first evaluation.

A kernel for a schema in a file is serialized with its `file:` URIs
relative to the entry's document (`src/kernel/kernel-uris.js`), so it
doesn't say where the files are and can be restored on another machine. A
URI in the entry's own document is only its fragment (`#/properties/a`),
so the document can be renamed too, and another file is a relative path
(`common/address.json#/type`). `restore(jsonSchema, serialized, { uri })`
resolves them against where the entry is now. Without `uri`, they stay
relative, which still works as handles, because handles are only
compared. Other URIs are absolute. It didn't change the version, because
an operation's meaning didn't change, and an older kernel with absolute
URIs restores as it is. Rejected: relative to the working directory, like
messages, which would only restore from the same working directory, and a
deployed application often runs from another.

JSON text (`input: "json"`) is parsed with browser's error-tolerant
`fromJson`, and then the AST is evaluated. Validating while parsing is a possible
optimization later. The two phases don't rule it out.

## Contents

- [Evaluators](evaluators.md)
- [Optimizations](optimizations/README.md)
- [Evaluation state](evaluation-state.md): marks and the dynamic scope
- [Plugins](plugins.md)
- [Output formats](output-formats.md)

What a keyword does when it lowers is in [`lower`](../../specs/keyword/lower.md).
