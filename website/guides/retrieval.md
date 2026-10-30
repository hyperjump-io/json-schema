# Controlling retrieval

Schemas reference other schemas by URL, and your application retrieves
what they reference. You might validate against schemas you don't control,
such as ones uploaded by users. Then a schema could reference
`http://169.254.169.254/` or `file:///etc/passwd` and make your application
retrieve them.

That's why nothing is retrieved unless the `allowRetrieval` config allows
it. Schemas in [registries](loading-schemas.md#registries) are never
checked, because you put them there.

## `allowRetrieval`

It's a list of URLs:

- A URL that ends with `/` allows everything under it.
- Any other URL allows only itself.
- A relative URL is resolved against the working directory in Node.js and
  against the page in a browser.

The default is `["./"]`. In Node.js that allows files in the working
directory. In a browser it allows what's in the page's directory. Nothing
else is allowed, not even another path on the same server.

```typescript
const jsonSchema = new JsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
```

When you set your own list, include `"./"` if you still want to allow local
files. `[]` allows nothing, so only registries are used.

Retrieving anything else throws a `RetrievalNotAllowedError`:

```text
Retrieving 'https://example.com/other' isn't allowed. Use the 'allowRetrieval' config to allow it.
```

### What it protects against

- **Symlinks.** In Node.js, `file:` URLs are compared by their real paths.
  A symlink in an allowed directory can't lead outside it.
- **Redirects.** A response is checked again against the URL it came from,
  so a redirect can't lead somewhere you didn't allow. The redirected
  request is still sent, but its response isn't used.
- **The cache.** The check happens before anything is retrieved, so a
  cached response can't get around it.

In a worker there's no page to resolve relative URLs against, so use
absolute URLs.

## Different rules for different requests

A call or a session can have its own list. It replaces the config's list
instead of adding to it, so a session can allow less.

```typescript
const isPerson = await validator(jsonSchema, uri, {
  allowRetrieval: ["./schemas/"]
});

const session = jsonSchema.session({ allowRetrieval: ["./schemas/"] });
```

Use it when parts of your application trust different things. For example,
each tenant might have its own directory of schemas.

## Sending credentials

To send headers such as `Authorization` with `http:` and `https:` requests,
replace the HTTP plugin with one that has a `headers` function. It's called
with the URL of each request. Any schema can name any URL, so only send
credentials to the origins they're for.

```typescript
import {
  HttpUriSchemePlugin,
  MemoryHttpCacheStore
} from "@hyperjump/browser";

jsonSchema.addUriSchemePlugin(new HttpUriSchemePlugin(jsonSchema, {
  cache: new MemoryHttpCacheStore(),
  headers: (url) => url.origin === "https://schemas.example.com"
    ? { Authorization: `Bearer ${process.env.SCHEMAS_TOKEN}` }
    : undefined
}));
```

`headers` can be async, which lets you refresh a token. Replacing the plugin
replaces its cache too, so give it a cache. Without one, every compilation
retrieves its schemas again.

Retrieval comes from `@hyperjump/browser`. These work the same way on a
`JsonSchema`, and its docs cover them:

- [HTTP caching](https://github.com/hyperjump-io/browser/blob/v2/website/http-caching.md)
- [HTTP headers](https://github.com/hyperjump-io/browser/blob/v2/website/http-headers.md)
- [Adding URI schemes](https://github.com/hyperjump-io/browser/blob/v2/website/uri-schemes.md)
