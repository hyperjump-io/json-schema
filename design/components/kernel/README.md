# Compile and evaluate (`src/kernel/`)

Keywords lower to the kernel, a small language of operations that the
optimizer, the output formats, and lint understand. [the kernel spec](../../specs/kernel/README.md)
specifies it: the operations, the normal form, what the optimizer may do,
and what every keyword lowers to. This section is about how it's
implemented. Requirements: fast on plain JS values, exact error locations,
and extensibility (user keywords and plugins can run arbitrary code) can't
be traded away for speed.

There are two phases:

1. **Lower** (async, once per compiled schema, `lower.js`). Walk the
   schemas from the entry URI, in one pass, following references as it
   reaches them (see [Referenced schemas](../referenced-schemas.md)). Each
   keyword's value is parsed by its shape, with the schemas in it
   compiled, and given to its `lower` with the siblings it declares. The
   result is a `Kernel`: a table of handles (canonical URIs) to a boolean
   or the schema's keyword groups, and the dynamic anchors of every
   resource. Schemas refer to each other by handle, so cycles are fine.
   Expressions are in the normal form (`normalize.js`). Schemas are
   lowered one at a time, in the order they're found, so what's compiled
   and what fails is the same every time.
   - A schema is read through targets, a step at a time, with browser's
     step functions (`jrefStep`, `jrefArrayIter`, `jrefObjectEntries`) and
     `reference: "manual"`, so it's read as it's written. Parsing a
     keyword's value by its shape is recursion that decides what to step
     into and builds a result from what comes back, which is what the
     step functions are for. Every schema and reference it reaches is a
     target, so a subschema is queued as one, a reference is followed
     from one, and nothing makes a target from a node.
   - A reference is followed where a shape says a schema is applied,
     with `get` from the reference's target. So parsing waits, and
     `lowerKeywords`, which lint shares, is asynchronous. A keyword's
     `lower` isn't.
   - A keyword whose shape is data has no schemas or references in its
     value, so it's read from its node, without a step or a wait. Most
     keywords are, and stepping to each of their values made lowering
     about 60 percent slower on 37 real schemas.
   - `lowerKeywords` reads a schema the way its inputs say (`Reader`):
     as targets, or as nodes, for a schema that isn't in a document (see
     [Lowering for lint](../../specs/kernel/lowering-for-lint.md)).
   - The schemas with a resource's dynamic anchors are queued too, each
     found by its location from the document it's in. Evaluation might
     need them whenever it enters the resource, and nothing can be
     retrieved then.
   - A reference is retrieved when it's reached, so references are
     retrieved one at a time. A schema that refers to many documents that
     are slow to arrive takes the sum of them: 20 references that each
     take 5 ms compile in about 135 ms.
   - Rejected: browsing from the schema with `jrefVisit` to find every
     schema it applies, and lowering them afterwards. A visitor gets a
     schema before its references are followed, so it can't lower it, and
     a schema's values were read twice, once to browse and once to lower.
   - Rejected: walking the nodes and following each reference with `get`,
     with a target made for each subschema from its node. Nothing should
     make a target from a node it has.
   - Rejected: lowering every schema it can with what's been retrieved,
     then retrieving what the rest need at the same time, and lowering
     those again, until nothing is missing. It retrieved in parallel (17
     ms for the 20 references), but a schema with a reference was lowered
     twice, with a placeholder for what wasn't there yet, and compiling
     kept what was needed, what was being retrieved, and which document
     each schema came from.
   - Rejected: finding a schema's references by its keywords' shapes when
     the schema is found, following them then, and waiting for them when
     it's lowered. It was the fastest measured and parallel, but a
     keyword's value was read twice, once for its references and once to
     lower it.
   - Rejected: one pass with every schema lowered as soon as it's found
     and the kernel put together afterwards in a fixed order. It retrieved
     in parallel, but it made promises for every schema, and a whole
     compile was 20 to 25 percent slower.
   - Rejected: fetching every `href` up front, because it would retrieve
     what isn't compiled, like references in `$defs` that nothing applies.
   - A handle names one schema, so a kernel can only have one resource for
     a URI. A resource that's reached in two documents has to be identical
     in both, or it's a `duplicate-id` problem. Schemas are queued by node,
     not by handle, so a resource that's in two documents has its
     references followed from each, and what they find is compared too.
     What's compiled doesn't depend on which document was reached first.
   - A reference is followed from its own target. A reference to a
     schema that's a reference itself, like a draft-07
     `$ref`, finds what that one finds, looked for from the document it's
     in. References that lead back to one already followed are an error
     whose `cause.code` is `ERR_REFERENCE_CYCLE`, with the `chain`.
2. **Build evaluators** (sync, lazy). The kernel is optimized for what an
   evaluation can observe (see [Optimizations](optimizations/README.md)) and turned into closures.
   Each evaluator is built the first time it's needed and cached on the
   compiled schema (`Validator`, which isn't exported). No `eval`. Bytecode run by one interpreter loop was tried
   instead of closures and wasn't faster (see
   [the benchmarks](../../benchmarks/README.md)).
   - A function from `validator`, `validatorFor`, `annotator`, or
     `annotatorFor` builds every evaluator its options can use when it's
     made (`Validator.prepare`), not on its first call. Building the flag
     evaluator was most of the first call: a median of 76
     percent of a first pass over a corpus, and up to 95 (see
     [Building the flag evaluator first](../../benchmarks/flag-evaluator-first.md)).
     With an output format, that includes the evaluator for the format's
     plugin, which only runs if an instance is invalid. It's built once
     per compiled schema, not per evaluation, so building it later only
     saves anything if no instance is ever invalid, such as one call of
     `validate` on a valid instance. Otherwise it moves the cost to the
     first invalid instance. The format is called once when the function
     is made, to see whether its plugin has an `annotation` hook.
     `compile` doesn't build any, because it doesn't know which will be
     needed, and neither do `Validator`'s methods that take options on
     each call. Those build each evaluator the first time it's needed.
     Rejected: building the format plugin's evaluator on the first
     invalid instance. That's how it was at first, because whether it's
     needed depends on whether an instance is valid. But it only helped
     one-off validations of valid instances.

The kernel is JSON, so a compiled schema can be serialized
(`serialize` and `restore`). It's serialized as
lowered, before any optimization. It has `kernel: 1`, and
`restore` rejects any other version.

A compiled schema is its kernel and the definitions the kernel uses
(`src/kernel/definitions.js`): each group's keyword, which plugins see,
the formats that assert, and the keywords of escape hatches, for their
`evaluate`. Compiling and restoring collect them from the config's
definitions, so a definition that's missing fails there, not on the first
evaluation. The evaluators and `Validator` only read the kernel's
definitions, never the config. Lint's evaluator collects the ones the
config's definitions have, and
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
(`common/address.json#/type`). `restore(config, serialized, { uri })`
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
