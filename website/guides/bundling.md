# Bundling

`bundle` combines a schema and every schema it references into one
document. Use it to publish a schema that works without its files, or to
give one to a tool that can't follow references between documents.

```typescript
import { pathToFileURL } from "node:url";
import { bundle } from "@hyperjump/json-schema";

const uri = pathToFileURL("./schemas/person.schema.json").href;
const bundled = await bundle(jsonSchema, uri, {
  id: "https://example.com/schemas/person.schema.json"
});
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
  "$id": "https://example.com/schemas/person.schema.json",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "address": { "$ref": "./address.schema.json" }
  },
  "$defs": {
    "https://example.com/schemas/address.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": "https://example.com/schemas/address.schema.json",
      "type": "object",
      "properties": {
        "street": { "type": "string" }
      }
    }
  }
}
```

A schema can't be identified by a file, so a bundle of files needs an
identifier, which `id` gives the main schema. Each file in it is identified
where it is relative to the main schema, resolved against `id`, so
`./address.schema.json` finds it. Use the URL the schemas will be published
at. A file with an `$id` of its own keeps it, and so does a schema with a
URL. A file that references nothing doesn't need `id`.

What's bundled:

- The whole document the URI is in, and every document it references with
  `$ref` (and `$dynamicRef` in 2020-12), even from definitions nothing uses.
- Not meta-schemas.
- Schemas in any dialect. A schema whose dialect is different from the main
  schema's keeps its `$schema`.

## Options

```typescript
await bundle(jsonSchema, uri, {
  externalSchemas: ["https://schemas.example.com/common"],
  alwaysIncludeDialect: true,
  definitionNamingStrategy: "uuid"
});
```

| Option | What it does |
| --- | --- |
| `id` | The main schema's identifier, for a bundle of files. Each file is identified relative to it. It has to be an absolute URL that isn't a file. |
| `externalSchemas` | Schemas that will be available where the bundle is used. They aren't embedded, and neither is anything only they reference. |
| `alwaysIncludeDialect` | Give every embedded schema `$schema`, not only the ones in a different dialect |
| `definitionNamingStrategy` | Name embedded schemas by their identifier (`"uri"`, the default) or by a random UUID (`"uuid"`) |

`bundle` also takes `registry` and `allowRetrieval`, like `validator`, and
a schema can be given as a value.

## When a schema can't be bundled

`bundle` throws when a schema can't be embedded without changing what it
means:

- A reference finds a schema that's identified by a different URI.
- In draft-04 to draft-07, the root of a referenced schema is a `$ref`,
  which replaces the whole object, so its `$id` would be ignored.
- The main schema's dialect has no `$defs` or `definitions` to put it in.
- A file without an `$id` would be embedded, and there's no `id` to
  identify it by.

It throws a `SchemaError` for a schema with problems, and a `RetrievalError`
for one that can't be found, like `compile`.
