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

The default allows what's local to your application. In Node.js it's
`["./"]`, which allows files in the working directory. In a browser it's
`["/"]`, which allows the page's origin. Nothing else is allowed.

```typescript
const jsonSchema = configureJsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
```

When you set your own list, include `"./"` if you still want to allow local
files. `[]` allows nothing, so only registries are used.

Retrieving anything else throws a `TypeError`, the way `fetch` does for a
request that's blocked. Its `cause.code` is `"ERR_RETRIEVAL_NOT_ALLOWED"`,
and its `url` is the URL that was refused:

```text
Fetching 'https://example.com/other' isn't allowed. Add it to 'allowRetrieval' to allow it.
```

### What it protects against

- **Symlinks.** In Node.js, `file:` URLs are compared by their real paths.
  A symlink in an allowed directory can't lead outside it.
- **Redirects.** Where a redirect leads is checked before it's followed,
  so a server can't make your application send a request to a URL you
  didn't allow. In a browser, `fetch` follows redirects itself, so the
  request is sent, but a response from a URL you didn't allow isn't used.
- **The cache.** The check happens before anything is retrieved, so a
  cached response can't get around it.
- **Files.** Only a schema from a file can reference a `file:` URL, so a
  schema from the web can't make your application read one, even one you
  allow.

In a worker there's no page to resolve relative URLs against, so use
absolute URLs.

## Different rules for different requests

A call or a session can have its own list. It replaces the config's list
instead of adding to it, so a session can allow less.

```typescript
const isPerson = await validator(jsonSchema, uri, {
  allowRetrieval: ["./schemas/"]
});

const session = new JsonSchemaHyperjump(jsonSchema, { allowRetrieval: ["./schemas/"] });
```

Use it when parts of your application trust different things. For example,
each tenant might have its own directory of schemas.

## Sending credentials

To send headers such as `Authorization` with requests, use the `headers`
config. Any schema can name any URL, so headers are given by URL and only the
URLs you list get them:

```typescript
const jsonSchema = configureJsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"],
  headers: {
    "https://schemas.example.com/": { Authorization: `Bearer ${process.env.SCHEMAS_TOKEN}` }
  }
});
```

A URL that ends with `/` gets its headers for everything under it, the same as
in `allowRetrieval`. A URL's headers can be a function instead, which can be
async, so you can refresh a token.

Retrieval comes from `@hyperjump/browser`. These work the same way on a
`JsonSchema`, and its docs cover them:

- [HTTP caching](https://github.com/hyperjump-io/browser/blob/v2/website/http-caching.md)
- [Headers](https://github.com/hyperjump-io/browser/blob/v2/website/sessions.md#headers)
- [Redirects](https://github.com/hyperjump-io/browser/blob/v2/website/redirects.md)
- [Layers](https://github.com/hyperjump-io/browser/blob/v2/website/layers.md), for a `stack` of your own, such as one with another URL scheme
