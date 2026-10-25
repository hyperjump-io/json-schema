# What can be retrieved (`allowRetrieval`)

Schemas aren't trusted. A schema shouldn't be able to make an application
retrieve whatever it names, such as an internal address over HTTP or a file
outside the project through a `file:` reference. So only what the
application allows is retrieved, and the default allows only what's local
to it.

It's browser's (`HyperjumpConfig.allowRetrieval`), because it's about
retrieval and browser does the retrieving, and JRef documents aren't
trusted either. How it works, where it's checked, symlinks, redirects, and
its known limitations are in browser's
[What can be retrieved](https://github.com/hyperjump-io/browser/blob/v2/design/components/allow-retrieval.md). This is how
JSON Schema uses it.

- It was in this package first, where it had to copy browser's context
  URI, run its own `realpath` next to the file plugin's, pass what a
  session allows to `retrieve` disguised as a `GetOptions` field, and
  unwrap the error from browser's `RetrievalError`.
- `JsonSchemaConfig` gets it from `HyperjumpConfig`, and
  `RetrievalNotAllowedError` is browser's, re-exported.
  `SessionOptions.allowRetrieval` replaces the config's for one session,
  and `JsonSchemaSession` passes it to browser's `Session` constructor. The
  CLI uses it for files with different settings.
- Browser checks it when a session retrieves a document that isn't in its
  cache. That's after embedded resources and registries, because
  `JsonSchemaSession.getDocument` finds those first. So it covers `get`,
  following references, `compile`, and meta-schemas found by `getDialect`.
- A `RetrievalNotAllowedError` isn't wrapped, so it's what `get` and
  `compile` throw. A refusal while getting a dialect's meta-schema is the
  `cause` of `getDialect`'s error.
- Tools use the difference between a refused URL and one that couldn't be
  retrieved: a refused URL is unknown, a failed one is missing (see
  [Other schemas](../lint/other-schemas.md)).
- `[]` allows nothing, so only registries and embedded resources are used.
  The test suite runners and the tests that only use registries use it
  instead of removing the `http(s):` URI scheme plugins. Tests that read
  files from a temporary directory, outside the working directory, allow
  that directory.
