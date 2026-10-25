# Request headers (browser)

- Headers to send with `http(s):` requests, such as credentials, are a
  `headers` option of `HttpUriSchemePlugin`, like `cache`, because they're
  HTTP's. There's no `JsonSchema` config for them. Setting them replaces the
  plugin with `addUriSchemePlugin`, and the cache with it.
- It's a function of the URL, `(url: URL) => HeadersInit | undefined`, and
  can be async. Schemas aren't trusted and can name any URL
  `allowRetrieval` allows, so a fixed set of headers would send credentials
  to every origin. A function lets them go only where they belong, and
  lets a token be refreshed.
- `Accept` is always the plugin's, because media type plugins depend on it.
- The headers are in the request the HTTP cache sees, so a `Vary` on them
  is respected, and revalidating sends them too. The cache is private and
  shared by every session, so headers belong to the plugin, not a session.
  Different credentials need different plugins, which don't share a cache.
- A redirect is sent with the same headers. `fetch` drops `Authorization`
  and `Cookie` when it redirects to another origin, but not other headers.
- The CLI doesn't have headers yet. Its settings are a file that's usually
  committed, so credentials would have to come from somewhere else, like
  environment variables.
