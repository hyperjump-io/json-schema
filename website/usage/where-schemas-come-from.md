# Where schemas come from

A schema is looked up in registries first, then retrieved by its URI.

- **Registries:** A `SchemaRegistry` holds schemas that aren't retrieved. A
  schema is identified by its `$id`, or by `retrievalUri` if it doesn't have
  one. A registry never changes. `with` and `without` return a new one.

  ```javascript
  const registry = new SchemaRegistry()
    .with(schema)
    .with(schemaText, { retrievalUri: "https://example.com/other" });
  ```

  Add a registry to the `JsonSchema` with `addRegistry`, or use one for a
  single compilation with `compile(uri, { registries: [registry] })`.

- **Files and HTTP:** `file:` and `http(s):` URIs are retrieved, if
  `allowRetrieval` allows them (see below). Only `application/schema+json`
  responses and `.schema.json` files are schemas. A plain `.json` file isn't.
  Relative references work as you'd expect.

  ```javascript
  import { pathToFileURL } from "node:url";

  const uri = pathToFileURL("./person.schema.json").href;
  const validator = await jsonSchema.compile(uri);
  ```

Schemas aren't trusted, so a schema can't make your application retrieve
whatever it names, like an internal address or a file outside your project.
Only what the `allowRetrieval` config allows is retrieved. It's a list of
URLs. One that ends with `/` allows everything under it, and any other allows
only itself. A relative one is resolved against the working directory in
Node.js and the page in a browser. The default is `["./"]`, which is what's
local to your application: files in the working directory in Node.js, and
what's in the page's directory in a browser. Anything else is a
`RetrievalNotAllowedError`. Registries are never checked.

```javascript
const jsonSchema = new JsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
```

A session can have its own list, which it uses instead, for when different
parts of your application can retrieve different things.

```javascript
const session = jsonSchema.session({ allowRetrieval: ["./schemas/"] });
```

In Node.js, `file:` URLs are compared by their real paths, so a symlink can't
lead outside a directory you allow. A response is checked again by the URL it
came from, so a redirect can't lead somewhere you didn't allow. The
redirected request is still sent, though. Its response just isn't used. Use
`[]` to allow nothing but registries. In a worker, there's no page to
resolve relative URLs against, so use absolute ones.

To send headers with `http(s):` requests, such as credentials, replace the
`http(s):` plugin with one that has a `headers` option. It's called with
each URL that's requested, so only send credentials to the origins they're
for. A schema can name any URL. It can be async, so you can refresh a token.
Replacing the plugin replaces its cache too, so give it one.

```javascript
import { HttpUriSchemePlugin, MemoryHttpCacheStore } from "@hyperjump/browser";

jsonSchema.addUriSchemePlugin(new HttpUriSchemePlugin(jsonSchema, {
  cache: new MemoryHttpCacheStore(),
  headers: (url) => url.origin === "https://schemas.example.com"
    ? { Authorization: `Bearer ${process.env.SCHEMAS_TOKEN}` }
    : undefined
}));
```
