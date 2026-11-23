# Public API

Part of [The API as functions](README.md).

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
| Session browsing: `browse`, `getDialect`, `annotation` | Any operation that walks schemas |

## Decided

- `browse(session, uri, { referencedFrom })` is how to follow a reference,
  documented in the website's
  [Sessions](../../../website/extending/sessions.md#following-references)
  page, with browser's `jrefFindAll` and `reference: "manual"` to find
  them as targets. An embedded resource is only
  found that way, so an operation that follows `$ref` without it, like a
  docs generator or a bundler, gets embedded resources wrong.
  `referencedFrom` is a target, the reference's node and the document
  it's in, and what `browse` returns is one, so a reference in what was
  found is followed from it in turn. Without it, `browse` only finds a
  whole document, from a registry or by retrieving it. Compiling and
  linting follow references this way, and bundling doesn't (see
  [Referenced schemas](../referenced-schemas.md)).
- `browse` is browser's, exported as it is. What it finds might not be a
  schema, so `isSchemaNode` and `isSchemaDocument` are exported with it.
  A document as it's written is `browse` with `reference: "manual"`, which
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
  rewriting references, naming definitions) are left for bundling OpenAPI
  descriptions in `@hyperjump/openapi`, which needs a different layout
  (`components/schemas`).

## For other packages

What [`@hyperjump/openapi`](https://github.com/hyperjump-io/openapi/blob/main/design/README.md) builds on,
which a package for another format with schemas in it would too.

| What | What it's for |
| --- | --- |
| `resolveSchemaAt` | Resolving a node as a schema in a document another resolver made, like a Schema Object |
| `defaultDialectFor` | A media type plugin finding `defaultDialects`' dialect for a document's URL |
| `toId`, `resolveId`, `iriProblem`, `noUrl`, and `Id` | A document's URI kept the way resources are, and messages about one that isn't valid |
| `propertyAlternatives` in `./lint` | Rules about which properties an object has to have |
| Each dialect's `keywords` and `formats` | A dialect that uses the built-in keywords, like `draft04Dialect.keywords.maximum` |

- Keyword and format modules aren't exported. A dialect that uses a
  built-in keyword takes it from the built-in dialect that has it, which
  says where it comes from. Rejected: `./keywords/*` and `./formats/*`,
  which make every file an API.
- The keyword helpers (`annotationKeyword`, the checks) aren't exported.
  They're a few lines, and a package that needs them has its own.
- The JSON-or-schema plugin still reads a top-level `openapi` and hands
  the document to the session's `application/openapi+json` plugin (see
  [OpenAPI documents](https://github.com/hyperjump-io/openapi/blob/main/design/components/documents.md)). It only names a
  media type, so it doesn't depend on the package. Rejected: a `.json`
  plugin in `@hyperjump/openapi` that wraps this one, which needs this one
  exported and a rule for which `.json` plugin a config has.
