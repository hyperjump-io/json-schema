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
| Schema AST types, `jsonSchemaConfig`, `isSchemaNode`, `isSchemaDocument`, `resolveSchema`, `jsonSchemaResolve`, `jsonSchemaValidate` | Editors and the language server, schemas in other formats, like YAML |
| The lint toolkit (`./lint`) | Lint rules |
| Session browsing: `get`, `getDialect`, `annotation` | Any operation that walks schemas |

## Decided

- `get(session, uri, { referencedFrom })` is how to follow a reference,
  documented in the website's
  [Sessions](../../../website/extending/sessions.md#following-references)
  page, with browser's `jrefFindAll` and `reference: "manual"` to find
  them as targets. An embedded resource is only
  found that way, so an operation that follows `$ref` without it, like a
  docs generator or a bundler, gets embedded resources wrong.
  `referencedFrom` is a target, the reference's node and the document
  it's in, and what `get` returns is one, so a reference in what was
  found is followed from it in turn. Without it, `get` only finds a
  whole document, from a registry or by retrieving it. Compiling and
  linting follow references this way, and bundling doesn't (see
  [Referenced schemas](../referenced-schemas.md)).
- `get` is browser's, exported as it is. What it finds might not be a
  schema, so `isSchemaNode` and `isSchemaDocument` are exported with it.
  A document as it's written is `get` with `reference: "manual"`, which
  doesn't follow a schema that's a reference.
- There's no `lower` function. `serialize(await compile(config, uri))`
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
