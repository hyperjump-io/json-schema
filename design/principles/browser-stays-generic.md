# Browser stays a generic client

`@hyperjump/browser` is a generic hypermedia client. JSON Schema builds on
it, and doesn't bend it (see [Browser v2](../components/browser-v2.md)).

- No JSON Schema concepts in browser's API or docs. Embedding, anchors, and
  registries are this package's. A change to browser for this package's
  sake has to make sense for any HTTP client, like the URL that was
  requested versus the one a redirect ended at.
- Browser's stack, down to the transport's schemes, is only for
  retrieving a resource. Registries aren't retrieved, so they aren't in
  the stack. Schemas in a registry are identified, by `$id`.
- What's retrieved is a URL, so retrieval uses WHATWG URLs (`new URL`,
  `pathToFileURL`). Only identifying schemas, as registries do, needs URI
  semantics (`@hyperjump/uri`), because JSON Schema identifiers are URIs and
  WHATWG URLs aren't fully compatible with them.
