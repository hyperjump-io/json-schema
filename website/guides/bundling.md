# Bundling

`bundle` combines a schema and every schema it references into one
document. Use it to publish a schema that works without its files. You can
also use it for a tool that can't follow references between documents.

```typescript
import { pathToFileURL } from "node:url";
import { bundle } from "@hyperjump/json-schema";

const uri = pathToFileURL("./schemas/person.schema.json").href;
const bundled = await bundle(config, uri, {
  id: "https://example.com/schemas/person.schema.json"
});
```

Each referenced document is embedded in the main schema's `$defs` under its
identifier. In draft-04 to draft-07 it's `definitions`. The references
themselves aren't changed. They find the embedded schema by its `$id`, the
way the 2020-12 spec describes bundling. The bundle validates exactly like
the schemas it was made from.

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

A schema in a bundle can't be identified by its file, so a bundle of files
needs an identifier. The `id` option gives the main schema one. Each other
file gets an identifier from its path relative to the main schema, resolved
against `id`. That's why `./address.schema.json` still finds it. Use the URL
where the schemas will be published.

A file with its own `$id` keeps it, and so does a schema with a URL. A file
that doesn't reference anything doesn't need `id`.

What's bundled:

- The whole document the URI is in.
- Every document it references with `$ref`, or `$dynamicRef` in 2020-12.
  This includes references from definitions that nothing uses.
- Schemas in any dialect. A schema whose dialect is different from the main
  schema's keeps its `$schema`.

Meta-schemas aren't bundled.

## Options

```typescript
await bundle(config, uri, {
  externalSchemas: ["https://schemas.example.com/common"],
  alwaysIncludeDialect: true,
  definitionNamingStrategy: "uuid"
});
```

| Option | What it does |
| --- | --- |
| `id` | The main schema's identifier for a bundle of files. Each file is identified relative to it. It has to be an absolute URL that isn't a `file:` URL. |
| `externalSchemas` | Schemas that will be available where the bundle is used. They aren't embedded. Neither is anything that only they reference. |
| `alwaysIncludeDialect` | Give every embedded schema a `$schema`, not only the ones in a different dialect |
| `definitionNamingStrategy` | How embedded schemas are named. `"uri"` uses their identifier and is the default. `"uuid"` uses a random UUID. |

Like `validator`, `bundle` also takes `registry` and `allowRetrieval`. The
schema can be given as a value.

## When a schema can't be bundled

`bundle` throws when a schema can't be embedded without changing what it
means:

- A reference finds a schema that's identified by a different URI.
- In draft-04 to draft-07, the root of a referenced schema is a `$ref`. The
  `$ref` replaces the whole object, so its `$id` would be ignored.
- The main schema's dialect has no `$defs` or `definitions` to put it in.
- A file without an `$id` would be embedded, and there's no `id` to
  identify it by.

Like `compile`, it throws a `SchemaError` for a schema with problems and
[browser's error](loading-schemas.md#when-a-schema-isnt-found) for a schema
that can't be found.
