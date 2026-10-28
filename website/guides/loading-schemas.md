# Loading schemas

Every schema is identified by a URI, and `compile` takes the URI of the
schema to compile. This page is about where the schema behind a URI comes
from: a registry you fill yourself, a file, or an HTTP server.

When a schema is needed, it's looked for in this order:

1. A schema embedded in the same document, for a reference from inside that
   document.
2. The registries of the session, then the registries of the `JsonSchema`.
3. Retrieval by its URI, for `file:`, `http:`, and `https:` URIs that
   [`allowRetrieval`](retrieval.md) allows.

## Registries

A `SchemaRegistry` holds schemas you already have, like ones bundled with
your application or stored in a database. A schema is found by its `$id`.

```typescript
import { SchemaRegistry } from "@hyperjump/json-schema";

const registry = new SchemaRegistry()
  .with({
    $schema: "https://json-schema.org/v1",
    $id: "https://example.com/person",
    type: "object",
    properties: {
      address: { $ref: "/address" }
    }
  })
  .with({
    $schema: "https://json-schema.org/v1",
    $id: "https://example.com/address",
    type: "object"
  });

jsonSchema.addRegistry(registry);
```

In TypeScript, a registry can check the schemas added to it, like
`new SchemaRegistry<V1Schema>()`. See
[Schemas in TypeScript](typescript.md#in-a-registry).

References between schemas in a registry work like references anywhere:
`/address` is resolved against `https://example.com/person`.

### JSON text or a value

A schema can be a JavaScript value or JSON text. Pass the text when you have
it, such as a file you read yourself. Then a problem with the schema is
reported with its line and column.

A value is copied when it's added, so changing it afterward doesn't change
the registry. A value that can't be JSON, like one with a cycle, throws a
`TypeError` when it's added.

```typescript
const text = await readFile("./person.schema.json", "utf8");
const registry = new SchemaRegistry().with(text);
```

### Schemas without `$id`

A schema without an `$id` needs a `retrievalUri` to be found by. It's also
the base URI for a relative `$id`. A schema without `$schema` can be given
its dialect with `dialectUri`. Neither can be a `file:` URL: a schema in a
file is loaded from the file.

```typescript
const registry = new SchemaRegistry().with({ type: "string" }, {
  retrievalUri: "https://example.com/name",
  dialectUri: "https://json-schema.org/v1"
});
```

### Where a schema came from

`origin` says where a schema came from, like the path of the file you read
it from. It isn't used to find the schema. Its document has it, and so does
every problem found in it, so you can show a problem where it is.

```typescript
const registry = new SchemaRegistry().with(text, { origin: "schemas/person.schema.json" });
```

### Changing a registry

A registry never changes. `with` and `without` return a new registry, so a
session that's already using a registry keeps seeing what it saw when it
started. To change what a `JsonSchema` sees, replace its registry.

```typescript
jsonSchema.removeRegistry(registry);
registry = registry.without("https://example.com/name");
jsonSchema.addRegistry(registry);
```

`without` removes a schema by the `retrievalUri` it was added with. A schema
added without one can't be removed.

### Registries for one compilation

Registries you pass to `compile` are only used for that compilation. They're
checked before the `JsonSchema`'s.

```typescript
const validator = await jsonSchema.compile("https://example.com/person", {
  registries: [registry]
});
```

## Files

Compile a schema in a file by its `file:` URL. References in it are
resolved relative to the file, so a `$ref` of `./address.schema.json` finds
the file next to it.

```typescript
import { pathToFileURL } from "node:url";

const uri = pathToFileURL("./schemas/person.schema.json").href;
const validator = await jsonSchema.compile(uri);
```

A `.json` file is a schema if its `$schema` is a dialect, like
`https://json-schema.org/v1`, whatever it's named. One without `$schema`
is a schema only if its name ends with `.schema.json`. Other files are
plain JSON, and referencing one is an error. Files aren't available in
browsers.

By default, only files in the working directory can be retrieved. See
[Controlling retrieval](retrieval.md) to allow more or less.

## HTTP

A schema at an `http:` or `https:` URL is retrieved if `allowRetrieval`
allows it. Nothing on the network is allowed by default.

```typescript
const jsonSchema = new JsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
addV1(jsonSchema);

const uri = "https://schemas.example.com/person";
const validator = await jsonSchema.compile(uri);
```

The response must be `application/schema+json`, or `application/json`
with a `$schema` that's a dialect. Responses are cached by
their caching headers, and a schema retrieved once is reused for the life of
the session. To send credentials, see
[Controlling retrieval](retrieval.md#sending-credentials).

## When a schema isn't found

`compile` throws when it can't find a schema:

- A `RetrievalNotAllowedError` when `allowRetrieval` doesn't allow the URI.
- A `RetrievalError`, from `@hyperjump/browser`, when the URI is allowed but
  retrieving it fails, like a file that doesn't exist or a `404`. Its
  `cause` is the error that stopped it.
- A `SchemaError` when the schema is found but has problems (see
  [Invalid schemas](invalid-schemas.md)).
