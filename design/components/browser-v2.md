# Browser v2

What this relies on from browser's `v2` branch. How each works, and why, is
in browser's [design docs](https://github.com/hyperjump-io/browser/blob/v2/design/README.md).

- A type parameter for property node annotations, JSON AST utilities that
  are generic over the node type, and a generic `DocumentNode<T>`.
- Embedding and anchors aren't in browser, because only JSON Schema uses
  them. Every document lookup, including following references, goes
  through `getDocument`, which a subclass can override. `getDocument` also
  gets the document a URI identifies, for what it has beyond its values,
  like a resource's dynamic anchors. A media type plugin's
  `fragmentPointer` defines what fragments identify, and each document
  records the media type of the plugin that parsed it.
- A file's media type uses the longest matching extension.
- `content-type` v3, with the parsed type validated.
- Methods are declared as methods, not function-valued properties, so a
  subclass can override them.
- Plugins are only configured in `HyperjumpConfig` (`uriSchemePlugins`,
  `mediaTypePlugins`), and a later plugin for a scheme or media type
  replaces an earlier one. `JsonSchema` passes its media type plugins to
  `super` before the config's, so an application can replace them, and its
  JSON plugin replaces browser's. `JsonSchemaConfig` is
  `HyperjumpConfig<JsonSchemaNode>`, so its media type plugins parse
  schema documents.
- Sessions, and an HTTP cache in the `http(s):` URI scheme plugin. A media
  type plugin's `parse` gets the session.
- `allowRetrieval`, in the config and in a session's options, and
  `RetrievalNotAllowedError` (see [What can be retrieved](sessions/allow-retrieval.md)).
- `jsonValue` supports arrays and objects. `Session.value` doesn't, because
  it would need to follow references.
- `fromJson` returns syntax errors as plain objects in `errors`, and
  `jsonSyntaxErrorMessage` describes one. They become `VFileMessage`s
  where they're reported or thrown.
- Node locations are valid IRIs. Each pointer segment is percent-encoded
  with `appendToLocation` (`@hyperjump/uri`'s `encodeIriFragment`), which
  produces normalized IRIs, and `get` decodes a fragment before following
  it as a JSON Pointer. The resolver and compiler build locations the same
  way. Instance locations in output are JSON Pointers, so they aren't
  encoded.
