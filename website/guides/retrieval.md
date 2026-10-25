# Controlling retrieval

Schemas reference other schemas by URL, and your application retrieves
what they reference. If you validate against schemas you don't control, such
as ones uploaded by users, a schema could reference
`http://169.254.169.254/` or `file:///etc/passwd` and make your application
retrieve them.

So nothing is retrieved unless the `allowRetrieval` config allows it.
Schemas in [registries](loading-schemas.md#registries) are never checked,
because you put them there.

## `allowRetrieval`

It's a list of URLs:

- One that ends with `/` allows everything under it.
- Any other allows only that URL.
- A relative one is resolved against the working directory in Node.js and
  against the page in a browser.

The default is `["./"]`: files in the working directory in Node.js, and
what's in the page's directory in a browser. Nothing else, not even another
path on the same server.

```javascript
const jsonSchema = new JsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
```

Include `"./"` to keep allowing local files when you add to it. `[]` allows
nothing, so only registries are used.

Anything else throws a `RetrievalNotAllowedError`:

```
Retrieving 'https://example.com/other' isn't allowed. Use the 'allowRetrieval' config to allow it.
```

### What it protects against

- **Symlinks.** In Node.js, `file:` URLs are compared by their real paths,
  so a symlink in an allowed directory can't lead outside it.
- **Redirects.** A response is checked again by the URL it came from, so a
  redirect can't lead somewhere you didn't allow. The redirected request is
  still sent, though. Only its response isn't used.
- **The cache.** It's checked before anything is retrieved, so a cached
  response isn't a way around it.

In a worker, there's no page to resolve relative URLs against, so use
absolute ones.

## Different rules for different requests

A session can have its own list. It replaces the config instead of adding
to it, so a session can allow less.

```javascript
const validator = await jsonSchema.compile(uri, { allowRetrieval: ["./schemas/"] });

const session = jsonSchema.session({ allowRetrieval: ["./schemas/"] });
```

Use it when parts of your application trust different things, like each
tenant's own directory of schemas.

## Sending credentials

To send headers with `http:` and `https:` requests, such as an
`Authorization` header, replace the HTTP plugin with one that has a
`headers` function. It's called with the URL of each request, so send
credentials only to the origins they're for. Any schema can name any URL.

```javascript
import { HttpUriSchemePlugin, MemoryHttpCacheStore } from "@hyperjump/browser";

jsonSchema.addUriSchemePlugin(new HttpUriSchemePlugin(jsonSchema, {
  cache: new MemoryHttpCacheStore(),
  headers: (url) => url.origin === "https://schemas.example.com"
    ? { Authorization: `Bearer ${process.env.SCHEMAS_TOKEN}` }
    : undefined
}));
```

`headers` can be async, so you can refresh a token. Replacing the plugin
replaces its cache too, so give it one. Without a cache, every compilation
retrieves its schemas again.

Retrieval comes from `@hyperjump/browser`. Its docs cover
[HTTP caching](https://github.com/hyperjump-io/browser/blob/v2/website/http-caching.md),
[HTTP headers](https://github.com/hyperjump-io/browser/blob/v2/website/http-headers.md),
and [adding URI schemes](https://github.com/hyperjump-io/browser/blob/v2/website/uri-schemes.md),
which work the same way on a `JsonSchema`.
