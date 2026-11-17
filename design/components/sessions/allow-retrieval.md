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

- `JsonSchemaConfig` gets it from `HyperjumpConfig`.
  `SessionOptions.allowRetrieval` replaces the config's for one session,
  which is the `allowRetrieval` of the `Hyperjump` the session is made
  with. The CLI uses it for files with different settings.
- Browser checks it when a session's `Hyperjump` fetches, for each step of
  a redirect too. That's after embedded resources, which browser finds
  first, and after the registries, which the session's `fetch` asks before
  the `Hyperjump`. So it covers `browse`, following references, `compile`,
  and meta-schemas found by `getDialect`, and it doesn't apply to a
  registry's schema.
- A refusal is browser's network error whose `cause.code` is
  `ERR_RETRIEVAL_NOT_ALLOWED`, so it's what `browse` and `compile` throw. A
  refusal while getting a dialect's meta-schema is the `cause` of
  `getDialect`'s error.
- Tools use the difference between a refused URL and one that couldn't be
  retrieved: a refused URL is unknown, a failed one is missing (see
  [Other schemas](../lint/other-schemas.md)). A server's `403` is unknown
  too, because a server that refuses doesn't say whether there's anything
  there either.
- `[]` allows nothing, so only registries and embedded resources are used.
  The test suite runners and the tests that only use registries use it
  instead of a stack that can't fetch. Tests that read
  files from a temporary directory, outside the working directory, allow
  that directory.
