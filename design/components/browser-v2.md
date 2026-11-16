# Browser v2

What this relies on from `@hyperjump/browser` v2. How each works, and why,
is in browser's [design docs](https://github.com/hyperjump-io/browser/blob/v2/design/README.md).

- The JSON AST: a type parameter for property node annotations, utilities
  that are generic over the node type, and a generic `DocumentNode<T>`.
- A session is a `Hyperjump`, made from a configuration that's a plain
  value. Documents are functions of a session: `get(session, url)` and
  the `jref*` functions. `get` with `reference: "manual"` is the
  document at a URL as it's written, which bundling, linting, and
  dialects use. What they need
  of one is its `fetch`, `state`, `contextUrl`, and `config`
  (`DocumentSession`). A JSON Schema session is a `Hyperjump` made from a
  config with the JSON Schema media types (see [Sessions](sessions/README.md)).
- A config's `registry` is asked before `allowRetrieval` and the stack. A
  `SchemaRegistry` is one, so its schemas aren't retrieved (see
  [Registries](registries/README.md)).
- `session.state(key, init)` keeps what lives as long as the session. What
  a session has for schemas is there: its registries, its resources, and
  the dialects it built from meta-schemas.
- Retrieval is a stack of layers on a transport, which a session is given
  as `stack`. Sessions made from a config with one share it, and its HTTP
  cache if it has one. Without one, each session has browser's default
  stack, which has no HTTP cache (see
  [JSON Schema as a media type](api/json-schema-media-type.md#sharing-the-http-cache)).
  Before 2026-11-14, every session of a `JsonSchema` shared one with an
  HTTP cache in Node.js (`src/default-stack.js`).
- A session keeps a document under the URL its response came from, never
  the one the document says it has. A schema document's `url` is its
  `uri`, which is its `$id`, so a retrieved schema is only found by where
  it was retrieved from, and its `$id` doesn't answer for another URL.
- A target, which is what `get` and the `jref*` functions return and
  what a reference is followed from: a node and the document it's in,
  which is the document that was retrieved. A schema's resource is the
  one in its document's `embedded` with the URI of its location, so
  compiling has a schema's dialect, dynamic anchors, and document without
  looking anything up.
- Embedded documents. A document's `embedded` has the documents it
  contains, and a reference from the document, given as a target in it
  (`referencedFrom`), finds them before anything is retrieved. Every
  resource of a schema document is in its `embedded`, the root too, so a
  reference to a document's own `$id` finds it there.
- Anchors aren't in browser, because only JSON Schema uses them. A media
  type plugin's `fragmentPointer` says what a fragment identifies, and
  browser keeps the plugin that parsed a document, so a document doesn't
  say its media type.
- A media type plugin is a plain value, in the session's `mediaTypes`. The
  plugin with the most specific match for a response parses it, and the
  first one wins a tie. `jsonSchemaConfig` puts JSON Schema's first, in
  the order they run, JSON Schema and then JSON that can be a schema, and
  the options' `mediaTypes`, like JRef, after them, so JSON is read by the
  plugin that finds schemas in it. Before 2026-11-14, `JsonSchema` put
  its plugins, with JRef, before the config's itself.
- A plugin's `parse` gets the response and the session. The response has
  the `Content-Type`'s `schema` and `profile` parameters, and the session
  is what a schema's meta-schema is retrieved in.
- A file's media type is the one for the longest extension that matches.
- What `get` and the `jref*` functions return is typed by the session's
  media types, since a reference can lead to a document in any of them. A
  `Hyperjump<C>` has its config's type, so the node of what it finds is a
  schema's node, a JSON node, or a node of another of the config's media
  types, like JRef (see [Sessions](sessions/README.md)).
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
