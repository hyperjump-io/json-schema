# Browser v2

What this relies on from `@hyperjump/browser` v2. How each works, and why,
is in browser's [design docs](https://github.com/hyperjump-io/browser/blob/v2/design/README.md).

- The JSON AST: a type parameter for property node annotations, utilities
  that are generic over the node type, and a generic `DocumentNode<T>`.
- A session is a `Hyperjump`, made from a configuration that's a plain
  value. Documents are functions of a session: `get(session, url)`,
  `documentOf(session, node)`, and the `jref*` functions. What they need
  of one is its `fetch`, `state`, `contextUrl`, and `config`
  (`DocumentSession`), so a `JsonSchema`'s session is a value with those,
  whose `fetch` asks the registries first (see
  [Sessions](sessions/README.md)).
- `session.state(key, init)` keeps what lives as long as the session. What
  a session has for schemas is there: its registries, its resources, and
  the dialects it built from meta-schemas.
- Retrieval is a stack of layers on a transport, which a session is given
  as `stack`. Every session of a `JsonSchema` has the same one. In Node.js,
  it has an HTTP cache, since browser's default stack doesn't have one
  (`src/default-stack.js`).
- A session keeps a document under the URL its response came from, never
  the one the document says it has. A schema document's `url` is its
  `uri`, which is its `$id`, so a retrieved schema is only found by where
  it was retrieved from, and its `$id` doesn't answer for another URL.
- Embedded documents. A document's `embedded` has the documents it
  contains, and a reference from the document, given as the reference's
  node (`referencedFrom`), finds them before anything is retrieved.
  Browser finds the document a node is in from the node's location, among
  the documents the session has and the ones they contain. Every
  resource of a schema document is in its `embedded`, the root too, so a
  reference to a document's own `$id` finds it there.
- Anchors aren't in browser, because only JSON Schema uses them. A media
  type plugin's `fragmentPointer` says what a fragment identifies, and
  browser keeps the plugin that parsed a document, so a document doesn't
  say its media type.
- A media type plugin is a plain value, in the session's `mediaTypes`. The
  plugin with the most specific match for a response parses it, and the
  first one wins a tie. `JsonSchema` puts its plugins before the config's:
  JSON Schema, JSON that can be a schema, and JRef. So JSON is read by the
  plugin that finds schemas in it, even when the config has browser's
  defaults, and the config's can't replace them.
- A plugin's `parse` gets the response and the session. The response has
  the `Content-Type`'s `schema` and `profile` parameters, and the session
  is what a schema's meta-schema is retrieved in.
- A file's media type is the one for the longest extension that matches.
- What `get` and the `jref*` functions return is typed by the session's
  media types, since a reference can lead to a document in any of them. A
  `JsonSchema`'s session says its media types, so what it finds is a
  schema's node, a JRef node, a JSON node, or a node of one of the
  config's media types (see [Sessions](sessions/README.md)).
- `allowRetrieval`, in the config. A session of its own allowance is a
  `Hyperjump` made with it. A refusal is a network error whose
  `cause.code` is `ERR_RETRIEVAL_NOT_ALLOWED` (see
  [What can be retrieved](sessions/allow-retrieval.md)).
- A failure says why with a `cause.code`, and the exact URL it's about is
  its `url`. There are no error classes. A network error is the
  `TypeError` `fetch` rejects with, like `ENOENT` for a missing file. A
  response that isn't a success is `ERR_HTTP_STATUS`, with its `status`.
  A JSON Pointer that doesn't lead to a value is one of `ERR_POINTER_*`.
  An anchor that isn't in a schema is this package's `ERR_ANCHOR_NOT_FOUND`.
- Nothing wraps what a plugin's `parse` throws, so a schema with problems
  fails its retrieval with its `SchemaError`.
- Browser's identifiers are WHATWG URLs and this package's are IRIs, so
  it converts where they meet: the media type plugins turn a
  response's URL into an IRI (`urlToIri`), and a schema document's `url`
  is its `uri` as a URL. JSON that isn't from anywhere, like an instance,
  gets a placeholder URL (`noUrl`), because a browser document has to have
  one, and nothing reads it.
- `jsonValue` supports arrays and objects. `jrefValue` doesn't, because it
  would need to follow references.
- `fromJson` returns syntax errors as plain objects in `errors`, and
  `jsonSyntaxErrorMessage` describes one. They become `VFileMessage`s
  where they're reported or thrown.
- Node locations are valid IRIs. Each pointer segment is percent-encoded
  with `appendToLocation`, and `get` decodes a fragment before following
  it as a JSON Pointer. The resolver and compiler build locations the same
  way. Instance locations in output are JSON Pointers, so they aren't
  encoded.

## Known limitations

- A meta-schema that's retrieved to build a dialect isn't caused by the
  schema that needs it, so a trace doesn't show it under that schema. The
  resolver would need the response it's resolving to say so. A `$schema`
  written as a `file:` URI is already an error, so a schema from the web
  can't make a file be read this way.
- A redirect that leads to a schema in a registry is retrieved. The
  registries answer a session's `fetch`, and browser follows a redirect
  below that.
