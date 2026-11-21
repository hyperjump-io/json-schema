# Loading schemas

Every schema is identified by a URI. `compile` takes the URI of the schema
to compile. This page is about where the schema behind a URI comes from. It
can come from a registry you fill yourself, a file, or an HTTP server.

When a schema is needed, it's looked for in this order:

1. A schema embedded in the same document. This applies to a reference
   from inside that document.
2. The registry passed to `compile` or another operation, and the
   [config's](#schemas-for-every-call).
3. Retrieval by its URI. This works for `file:`, `http:`, and `https:` URIs
   that [`allowRetrieval`](retrieval.md) allows.

## Registries

A `SchemaRegistry` holds schemas you already have, like ones bundled with
your application or stored in a database. A schema is found by its `$id`.
The registry's type parameter is the type of schema it accepts, so each
schema is checked as you write it.

```typescript
import { SchemaRegistry } from "@hyperjump/json-schema";
import type { V1Schema } from "@hyperjump/json-schema/v1";

const registry = new SchemaRegistry<V1Schema>()
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

const isPerson = await validator(config, "https://example.com/person", { registry });
```

Pass the registry to `validator`, `compile`, `lint`, or any other operation
that needs its schemas. It's only used for that call. To share one between
calls, along with what they retrieve, give it to a
[session](../extending/sessions.md). A registry without a type parameter
accepts any JSON. For registries with
more than one dialect, see [Schema types](schema-types.md#in-a-registry).

References between schemas in a registry work like references anywhere
else. `/address` is resolved against `https://example.com/person`.

### JSON text or a value

A schema can be a JavaScript value or JSON text. If you have the text, such
as a file you read yourself, pass that. Then any problem with the schema is
reported with its line and column. Text isn't type-checked, because its
type is `string`.

A value is copied when it's added, so changing it afterward doesn't change
the registry. Adding a value that can't be JSON, like one with a cycle,
throws a `TypeError`.

```typescript
const text = await readFile("./person.schema.json", "utf8");
const registry = new SchemaRegistry().with(text);
```

### Schemas without `$id`

A schema without an `$id` needs a `retrievalUri` so it can be found. The
`retrievalUri` is also the base URI for a relative `$id`. To give a schema
without `$schema` its dialect, use `dialectUri`. Neither option can be a
`file:` URL, because a schema in a file is loaded from the file.

```typescript
const registry = new SchemaRegistry<V1Schema>().with({ type: "string" }, {
  retrievalUri: "https://example.com/name",
  dialectUri: "https://json-schema.org/v1"
});
```

### Where a schema came from

`origin` says where a schema came from, like the path of the file you read
it from. It isn't used to find the schema. The schema's document has it,
and so does every problem found in the schema. That lets you show each
problem where it is.

```typescript
const registry = new SchemaRegistry().with(text, { origin: "schemas/person.schema.json" });
```

### Changing a registry

A registry never changes. `with` and `without` return a new registry. A
session that's already using a registry keeps seeing what it saw when it
started.

```typescript
const withoutName = registry.without("https://example.com/name");
```

`without` removes a schema by the `retrievalUri` it was added with. A schema
added without one can't be removed.

### Schemas for every call

Some schemas belong everywhere, like a
[custom meta-schema](dialects.md#custom-meta-schemas) that defines a
dialect your schemas use. Put those in the config's `registry`, and every
call and session can find them.

```typescript
const metaSchemas = new SchemaRegistry().with(myMetaSchema);

const config = jsonSchemaConfig({
  dialects: [draft202012Dialect],
  registry: metaSchemas
});
```

A call sees its own registry and the config's as one registry. A schema in
either can use a dialect whose meta-schema is in the other. If both have a
schema with the same URI, that's an error, so a call's registry can't
replace a schema in the config's. Keep schemas that change in the
registries you pass to calls, so you can make the config once.

### Combining registries

`concat` makes one registry from several. For example, you might combine
your application's schemas with generated ones. The schemas are shared, not
copied. Two different schemas with the same `retrievalUri` throw.

```typescript
const isPerson = await validator(config, "https://example.com/person", {
  registry: registry.concat(generated)
});
```

A registry is iterable. You can list what's in it or make a new registry
from some of its schemas. Each schema comes out as JSON text, even if it
was added as a value.

```typescript
const fromFiles = new SchemaRegistry([...registry].filter((entry) => entry.origin?.startsWith("schemas/")));
```

## Files

Compile a schema in a file by its `file:` URL. References in it are
resolved relative to the file, so a `$ref` of `./address.schema.json` finds
the file next to it. A reference, an `$id`, or a `$schema` can't be a
`file:` URL, because it would only work on your machine. A custom
meta-schema in a file needs an `$id`. It's found by that `$id` from a
[registry](#registries).

```typescript
import { pathToFileURL } from "node:url";

const uri = pathToFileURL("./schemas/person.schema.json").href;
const isPerson = await validator(config, uri);
```

A `.json` file is a schema if its `$schema` is a dialect, like
`https://json-schema.org/v1`, no matter what it's named. A file without
`$schema` is only a schema if its name ends with `.schema.json`. Other
files are plain JSON, and referencing one is an error. Files aren't
available in browsers.

By default, only files in the working directory can be retrieved. See
[Controlling retrieval](retrieval.md) to allow more or less.

## HTTP

A schema at an `http:` or `https:` URL is retrieved if `allowRetrieval`
allows it. Nothing on the network is allowed by default.

If you expect to retrieve schemas over HTTP, give the config an HTTP cache
too, with `httpCache`. Each call has a session of its own, so without one,
every call retrieves its schemas again, even the same ones. With one, a
schema is retrieved again only when its caching headers say it's stale.
Make the config once, so every call shares its cache.

```typescript
import { MemoryCacheStore } from "@hyperjump/browser";

const config = jsonSchemaConfig({
  dialects: [v1Dialect],
  allowRetrieval: ["./", "https://schemas.example.com/"],
  httpCache: new MemoryCacheStore()
});

const uri = "https://schemas.example.com/person";
const isPerson = await validator(config, uri);
```

The store is where the cache keeps responses. `MemoryCacheStore` keeps them
for as long as the process runs, and `FileCacheStore` keeps them on disk.
See [Retrieving less](retrieval.md#retrieving-less). In a browser, leave
`httpCache` out, because the browser caches responses itself.

The response must be `application/schema+json`, or `application/json` with
a `$schema` that's a dialect. A schema that's been retrieved is reused for
the life of the session. To send credentials, see
[Controlling retrieval](retrieval.md#sending-credentials).

## When a schema isn't found

`compile` throws when it can't find a schema:

- An error from `@hyperjump/browser` when retrieving it fails. Its
  `cause.code` says why, and its `url` is the URL that failed. When
  `allowRetrieval` doesn't allow the URI, the code is
  `"ERR_RETRIEVAL_NOT_ALLOWED"`. A file that doesn't exist is `"ENOENT"`,
  and a response that isn't a success, like a `404`, is
  `"ERR_HTTP_STATUS"`, with its `status`. See
  [browser's errors](https://github.com/hyperjump-io/browser/blob/v2/website/errors.md).
- A `SchemaError` when the schema is found but has problems. See
  [Invalid schemas](invalid-schemas.md).
- An `Error` with the code `"ERR_NOT_A_SCHEMA"` when what's found isn't a
  schema, like a JSON document that isn't one, or a reference to
  `#/required`.
- An `Error` when a schema in a registry probably has the URI, by its
  `$id`, but can't be used. One whose `$schema` is a dialect that isn't
  defined, by the dialects you gave `jsonSchemaConfig` or a
  meta-schema in the registry, has the code `"ERR_DIALECT_NOT_DEFINED"`,
  with its `dialect`. Nothing is retrieved for it, even if the URI could
  be:

  ```text
  'https://example.com/person' is in the registry, but it can't be identified until the 'https://example.com/my-dialect' dialect is defined
  ```
