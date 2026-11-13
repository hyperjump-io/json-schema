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
   are in the normal form (`normalize.js`). All I/O happens here, but
   lowering a schema is synchronous (`lowerKeywords`, which lint shares):
   it lowers every schema it can with what's been retrieved, then
   retrieves, at the same time, what the rest need (what a reference finds
   and a dialect), and lowers those, until nothing is missing. A resource's
   dynamic anchors don't need retrieving: a schema is from a document the
   session has. A schema that's missing something isn't lowered until it's
   there. If more than one retrieval fails, the first one's error is
   thrown, so it's the same every time. Before 2026-10-30, lowering awaited
   each retrieval as it reached it, so every keyword was async. Fetching
   every `href` up front was rejected, because it would retrieve what isn't
   compiled, like references in `$defs` that nothing applies. It compiles
   the schemastore corpus to the same kernels in the same time.
   - A handle names one schema, so a kernel can only have one resource for
     a URI. A resource that's reached in two documents has to be identical
     in both, or it's a `duplicate-id` problem. Schemas are queued by node,
     not by handle, so a resource that's in two documents has its
     references followed from each, and what they find is compared too.
     What's compiled doesn't depend on which document was reached first.
   - What a reference finds is kept by the reference's document and the
     URI, since references from one document to a URI find the same
     thing. A schema's document is the one it was queued from, and it's
     only looked for, by a walk of its location, for a schema a reference
     found. Looking for every schema's made compiling a large schema three
     times slower.
2. **Build evaluators** (sync, lazy). The kernel is optimized for what an
   evaluation can observe (see [Optimizations](optimizations/README.md)) and turned into closures.
   Each evaluator is built the first time it's needed and cached on the
   compiled schema (`Validator`, which isn't exported). No `eval`. Bytecode run by one interpreter loop was tried
   instead of closures and wasn't faster (see
   [the benchmarks](../../benchmarks/README.md)).
   - A function from `validator` or `validatorFor` without `output` or
     `plugins` only ever uses the evaluator for a value with FLAG output
     (`flagEvaluator`), so it's built when the function is made, not on its
     first call. Building it was most of the first call: a median of 76
     percent of a first pass over a corpus, and up to 95 (see
     [Building the flag evaluator first](../../benchmarks/flag-evaluator-first.md)).
     `compile` doesn't build one, because it doesn't know which will be
     needed. Other options still build theirs on the first call.
     Rejected: building every evaluator a function's options could use,
     which for output or plugins depends on whether the instance is valid.

The kernel is JSON, so a compiled schema can be serialized
(`serialize` and `restore`). It's serialized as
lowered, before any optimization. It has `kernel: 1`, and
`restore` rejects any other version.

A compiled schema is its kernel and the definitions the kernel uses
(`src/kernel/definitions.js`): each group's keyword, which plugins see,
the formats that assert, and the keywords of escape hatches, for their
`evaluate`. Compiling and restoring collect them from the `JsonSchema`,
so a definition that's missing fails there, not on the first evaluation.
The evaluators and `Validator` only read the definitions, never the
`JsonSchema`. Lint's evaluator collects the ones the `JsonSchema` has, and
treats an asserting format without one as unknown. Before 2026-10-30, the
evaluators were given the `JsonSchema` to look definitions up in, which
made a compiled schema depend on a whole client, with its URI scheme
plugins and HTTP cache, for two lookups, and compiling didn't check
escape hatches' `evaluate`.

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
