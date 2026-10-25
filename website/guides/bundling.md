# Bundling

`bundle` combines a schema and every schema it references into one
document. Use it to publish a schema that works without its files, or to
give one to a tool that can't follow references between documents.

```javascript
import { pathToFileURL } from "node:url";

const bundled = await jsonSchema.bundle(pathToFileURL("./schemas/person.schema.json").href);
```

Each referenced document is embedded in the main schema's `$defs`
(`definitions` in draft-04 to draft-07), under its identifier. The
references themselves aren't changed. They find the embedded schema by its
`$id`, the way the 2020-12 spec describes bundling, so the bundle validates
exactly like the schemas it was made from.

For these two files:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "address": { "$ref": "./address.schema.json" }
  }
}
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "street": { "type": "string" }
  }
}
```

the bundle is:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "address": { "$ref": "./address.schema.json" }
  },
  "$defs": {
    "address.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": "address.schema.json",
      "type": "object",
      "properties": {
        "street": { "type": "string" }
      }
    }
  }
}
```

A bundle of files doesn't get an `$id`, and the files in it get identifiers
relative to it, so it can be moved like the files it came from. A bundle of
a schema with a URL keeps its URL.

What's bundled:

- The whole document the URI is in, and every document it references with
  `$ref` (and `$dynamicRef` in 2020-12), even from definitions nothing uses.
- Not meta-schemas.
- Schemas in any dialect. A schema whose dialect is different from the main
  schema's keeps its `$schema`.

## Options

```javascript
await jsonSchema.bundle(uri, {
  externalSchemas: ["https://schemas.example.com/common"],
  alwaysIncludeDialect: true,
  definitionNamingStrategy: "uuid"
});
```

| Option | What it does |
| --- | --- |
| `externalSchemas` | Schemas that will be available where the bundle is used. They aren't embedded, and neither is anything only they reference. |
| `alwaysIncludeDialect` | Give every embedded schema `$schema`, not only the ones in a different dialect |
| `definitionNamingStrategy` | Name embedded schemas by their identifier (`"uri"`, the default) or by a random UUID (`"uuid"`) |

`bundle` also takes `registries` and `allowRetrieval`, like `compile`.

## When a schema can't be bundled

`bundle` throws when a schema can't be embedded without changing what it
means:

- A reference finds a schema that's identified by a different URI.
- In draft-04 to draft-07, the root of a referenced schema is a `$ref`,
  which replaces the whole object, so its `$id` would be ignored.
- The main schema's dialect has no `$defs` or `definitions` to put it in.

It throws a `SchemaError` for a schema with problems, and a `RetrievalError`
for one that can't be found, like `compile`.
