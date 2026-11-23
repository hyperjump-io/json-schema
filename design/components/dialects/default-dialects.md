# Default dialects (`defaultDialects`)

A document that doesn't say its dialect gets one from its environment. The
user says which documents get which dialect, by URL.

- `defaultDialects` maps URLs to dialect URIs. It's a config option and a
  session option, and a session's replaces the config's, like
  `allowRetrieval` and `registry`. So a tool with settings for each folder,
  like the CLI, gives each session its own without a config for each.
- Its keys follow browser's rule for `headers` and `allowRetrieval`: a key
  that ends with `/` is for every URL under it, and any other key only for
  itself. When several match, the longest wins. Keys are compared parsed,
  without fragments. A relative key is resolved against the session's
  `contextUrl`, the working directory in Node.js and the page in a
  browser, when the session is first used.
- Exact keys are a `Map`, and only prefixes are tried one at a time, so a
  long list of files, like the CLI's globs expanded, costs nothing.
- The rule is copied from browser's `src/url-entries.js`, not exported
  from it, so browser's API doesn't grow for one package. Rejected:
  exporting `urlEntries` and `valuesFor` from browser, which is browser
  taking on an API only this uses. Rejected: browser holding URL-keyed
  maps for other packages, which puts this package's concern in browser.
- A document's dialect is the first of:
  1. Its `$schema`
  2. A registry entry's `dialectUri`, or an operation's `dialectUri` for a
     schema given as a value
  3. Its `Content-Type`'s `schema` parameter
  4. `defaultDialects`

  Otherwise, a schema without `$schema` is an error. The `schema`
  parameter is before `defaultDialects` because the server says it about
  that one document.
- A JSON document whose URL matches a key, and that doesn't have a
  top-level `$schema`, is a schema in that key's dialect, if the value is
  a dialect. That's the rule `$schema` has: a dialect makes a document a
  schema, and anything else leaves it JSON. A top-level `openapi` makes it
  an OpenAPI document, whose Schema Objects get the key's dialect (see
  [OpenAPI documents](../built-in-dialects/openapi-documents.md)). A key is
  the user naming those documents, which a default for every document
  wasn't (see below). Under a key like `./`, a data file is read as a
  schema, so keys should name schemas' folders or files.
- What has no URL gets a dialect as a value: a registry entry's
  `dialectUri`, `resolveSchema`'s and `jsonSchemaResolve`'s `dialectUri`,
  and an operation's `dialectUri` for a schema given as a value, which is
  how a boolean schema gets one.
- The docs show relative keys. An absolute `file:` key works, because a key
  is any URL, but it's only found on one machine.

Rejected:

- `defaultDialectUri`, one dialect for every schema that has none. It
  didn't make JSON documents schemas, because an instance file would have
  been read as one, so it only helped documents that were schemas already.
  Everything without a URL has a value to pass instead.
- `defaultDialectUri` taking URL prefixes, or a function, alongside one
  dialect for everything. Two options for one thing.
- Globs as keys. A library that runs in browsers can't match them without
  a dependency. The CLI expands its globs to files.
- A document being a schema because it's used as one, like by `compile`
  or a `$ref`, with the dialect from its key. A document is parsed once,
  before it's known how it's used, so it would be upgraded in place, and
  then what a tool sees in a file would depend on what used it first. A
  `$ref` to a data file by mistake would find a schema that allows almost
  everything, where it's now an error.

## Known limitations

- `file:` keys aren't compared by real path, as `allowRetrieval`'s are, so
  a working directory reached through a symlink can spell a key and a
  response's URL differently. The default is missed. It's not a security
  check, so the cost is a missing default.
