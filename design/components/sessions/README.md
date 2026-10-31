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
- An operation given a `JsonSchema` (`compile(jsonSchema, uri, { registry })`)
  creates a session for that call. Calls that run at the same time each
  have their own session, so they can't see each other's registries. A
  compiled schema doesn't need its session after compiling, because its
  kernel is self-contained.
- The `getDocument` override and the embedded index (see [Schema AST](../../specs/schema-ast.md)) are
  on `JsonSchemaSession`.
- An operation given a `JsonSchema` runs in a new session, so each call
  sees changes. Given a session, it runs in that session. Sessions only
  browse; compiling, bundling, and linting are functions (see
  [Validation API](../validation-api/README.md)).
- Dialects from the config belong to `JsonSchema`, and its `getDialect`
  only finds those. A dialect built from a meta-schema belongs to the
  session that built it. `JsonSchemaSession.getDialect` finds both, and it's
  what the resolver and the compiler use.
- Browser gives a media type plugin the session a document is being
  retrieved in (`parse(response, session)`), so the schema media type plugin
  resolves schemas in that session. Retrieving a schema in a plain `Session`
  is an error.
- Resolving after retrieving was considered on 2026-10-30, to take the
  session out of browser's `parse`: browser would only parse, and
  `JsonSchemaSession.getDocument` would resolve what it returns. Rejected,
  because it moves the dependency instead of removing it. Resolving still
  needs the session, for dialects, and moving it needs a cache of resolved
  documents next to browser's, the `Content-Type`'s `schema` and `profile`
  parameters carried on the parsed document (`getDocument` never sees the
  response), and the check that a `.json` file is a schema moved into
  `getDocument`, all to remove one parameter and two `instanceof` checks.
  `parse` is where the response is, so it's where resolving belongs.
  Browser's extension point isn't about JSON Schema either: any media type
  that needs other resources to parse a document, like XML with external
  entities or JSON-LD contexts, needs the session there. Anchors weren't
  the cost: fragments go through `fragmentPointer` on whatever
  `getDocument` returns, which would have been the resolved document.

## Contents

- [What can be retrieved](allow-retrieval.md)
- [The language server](language-server.md)
- [Registries](../registries/README.md)
