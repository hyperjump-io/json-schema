# Public API

Part of [The API as functions](README.md). Decided 2026-10-29.

With operations as functions, a third party writes one the same way we do,
so what it can build is what's public.

## Already public

These stay public, because something users write depends on them.

| What | What it's for |
| --- | --- |
| Keyword definitions: the `check`, `resolve`, `lower`, and `evaluate` hooks and their contexts | Custom keywords |
| Kernel expressions, the `Kernel` format (versioned with `kernel: 1`), and helpers like `subexpressions` | Custom keywords lower to expressions, and `serialize` returns a `Kernel` |
| `EvaluationPlugin` | Custom output formats, and anything that watches evaluation, like coverage |
| Schema AST types, `JsonSchemaMediaTypePlugin`, `resolveSchema`, `jsonSchemaResolve`, `jsonSchemaValidate` | Editors and the language server, schemas in other formats, like YAML |
| The lint toolkit (`./lint`) | Lint rules |
| Session browsing: `get`, `getDocument`, `getDialect`, `annotation` | Any operation that walks schemas |

## Decided

- `getDocument(uri, { referencedFrom })` and `get` are how to follow a
  reference, documented in the website's
  [Sessions](../../../website/extending/sessions.md#following-references)
  page, with `visitReferences` to find them. An embedded resource is only
  found that way, so an operation that follows `$ref` without it, like a
  docs generator or a bundler, gets embedded resources wrong.
  `referencedFrom` is the URI of the document the reference is in, because
  every resource in a document shares its index of what it embeds.
- There's no `lower` function. `serialize(await compile(context, uri))`
  is the kernel as it was lowered. The optimization passes run inside a
  validator, once for each evaluation mode, and what they produce is never
  returned. The lowered kernel is what tools need: provenance needs
  operations that haven't been combined or inlined (lint lowers each
  keyword with `lowerKeywords` for that), a type generator needs a
  reference to stay a reference so a definition can be a named type, and
  an optimized kernel changes whenever the passes do.
- Optimization passes and evaluators stay internal. Making passes public
  would make their order and the invariants a kernel keeps between them an
  API, and the passes changed a lot in 2026-10. They'd be needed for a
  generator of fast standalone validators, or for third-party rewrites,
  and they're reconsidered when someone needs that. Running a kernel is
  already public through `restore`.
- The bundler's parts (finding the documents a schema references,
  rewriting references, naming definitions) are left for the OpenAPI work,
  which needs a different layout (`components/schemas`).
