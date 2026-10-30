# Sessions

With one document cache for a `JsonSchema`'s whole life, a registry for
one compilation would be visible to compilations running at the same time,
and nothing could be removed without leaving resolved documents behind that
depended on it. So state is separated by how long it lives.

## Two levels

Both libraries have a long-lived object and sessions created from it, and
`JsonSchema` extends each level. Browser's side is in its
[design docs](https://github.com/hyperjump-io/browser/blob/v2/design/components/sessions.md), including its
[HTTP cache](https://github.com/hyperjump-io/browser/blob/v2/design/components/http-cache.md) and
[request headers](https://github.com/hyperjump-io/browser/blob/v2/design/components/request-headers.md).

| Level | Browser | JSON Schema adds |
| --- | --- | --- |
| Long-lived | `Hyperjump`: URI scheme and media type plugins, the HTTP cache | keywords and their schemas, formats, dialects, output formats, the `registry` every session sees |
| Session | `Session`: document cache, `get`, `step`, …, following references | its own `registry`, the embedded index, `compile` |

- The long-lived level only has state that doesn't depend on a session.
  Plugins, HTTP responses, and definitions are the same for every session.
  Anything that depends on registries, including every resolved document,
  belongs to a session and goes away with it, so nothing is ever left
  behind.
- `Hyperjump.session()` creates a session. `JsonSchema` overrides it to
  create a `JsonSchemaSession`. There's no default session. Browsing
  (`get`, `step`, …) is only on sessions, because a node needs its session to
  follow references.
- `JsonSchema.compile(uri, { registry })` creates a session for that
  compilation. Compilations that run at the same time each have their own
  session, so they can't see each other's registries. A `Validator` doesn't
  need its session after compiling, because its kernel is self-contained.
- The `getDocument` override and the embedded index (see [Schema AST](../../specs/schema-ast.md)) are
  on `JsonSchemaSession`.
- `JsonSchema.compile(uri)` compiles in a new session, so each compilation
  sees changes. `JsonSchemaSession.compile` compiles in that session.
- Dialects from `addDialect` belong to `JsonSchema`, and its `getDialect`
  only finds those. A dialect built from a meta-schema belongs to the
  session that built it. `JsonSchemaSession.getDialect` finds both, and it's
  what the resolver and the compiler use.
- Browser gives a media type plugin the session a document is being
  retrieved in (`parse(response, session)`), so the schema media type plugin
  resolves schemas in that session. Retrieving a schema in a plain `Session`
  is an error.

## Contents

- [What can be retrieved](allow-retrieval.md)
- [The language server](language-server.md)
- [Registries](../registries/README.md)
