# HTTP cache (browser)

- Retrieved responses go in an HTTP cache, according to their caching
  headers. It's under the URI scheme plugins and stores responses, not
  documents, so it doesn't depend on dialects or registries and is shared by
  every session.
- It's part of `HttpUriSchemePlugin` (a `cache` option), because caching
  headers are HTTP's. It uses `http-cache-semantics`, as a private cache.
  A stale response with an `ETag` or `Last-Modified` is revalidated. A 304
  that doesn't match the cached response is retried without revalidating.
- The store is pluggable (`HttpCacheStore`): `MemoryHttpCacheStore`, the
  default in Node.js, or `FileHttpCacheStore`, which outlives the process.
- In a browser, `fetch` already respects caching headers, so there's no
  cache by default.
- A session's document cache keeps it from retrieving the same resource
  twice. Sessions retrieving the same URL at the same time share one
  request.
- `file:` responses aren't cached, so each new session reads files again.
