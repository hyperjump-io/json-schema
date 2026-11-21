# Registries (`SchemaRegistry`)

A registry holds schemas that aren't retrieved from a URI. It's separate
from the config so one registry can be shared by several configs and
sessions. A registry never changes. `with` and `without` return a new one,
so the registries a session sees are its snapshot of them.

```ts
class SchemaRegistry<S = ReadonlyJson> {
  constructor(entries?: Iterable<{ schema: S | string; retrievalUri?: string; dialectUri?: string }>);
  with(schema: S | string, options?: { retrievalUri?: string; dialectUri?: string }): SchemaRegistry<S>;
  without(retrievalUri: string): SchemaRegistry<S>;
  concat<T>(...registries: SchemaRegistry<T>[]): SchemaRegistry<S | T>;
  [Symbol.iterator](): Iterator<SchemaRegistryEntry>;
}
```

`S` is the type of the schemas it takes, like `V1Schema`, so schemas written
in TypeScript are checked (see [Schema types](../schema-types.md)).

Implemented in `src/registry/schema-registry.js`, with the index of a
registry for some definitions in `src/registry/registry-index.js`. How
a registry answers a session is in `src/registry/registry-lookup.js`.

- A registry keeps its entries in a private field, and the modules that
  index it read them by iterating it, which gives the same entry objects,
  so what's cached from them is shared. Rejected: a module-level `WeakMap`
  of each registry's entries, which was a private field kept outside the
  registry. `createdEntries`, a `WeakSet`, stays: it tells an entry a
  registry made, which can be shared, from an object that only looks like
  one, which has to be checked.

- A registry's schema isn't retrieved, so the registry isn't in the stack.
  A `SchemaRegistry` is browser's `Registry`, a config's `registry`, which
  `Hyperjump`'s `fetch` asks before `allowRetrieval` and the stack, with
  the session (see [Sessions](../sessions/README.md)). So a schema in one
  is found before anything is retrieved, and `allowRetrieval` doesn't
  apply to it. Its `get` finds the definitions in the session's config,
  and a registry is keyed by IRI, so it works out the `Id` of the URL it's
  asked for.
  - It answers with a `DocumentResponse`, a response that has the resolved
    document (`src/registry/document-response.js`), and the schema media
    type plugin gives the session that document. An entry is resolved once
    for every session that can share it (see
    [Making sessions cheap](cheap-sessions.md)), and its `origin` is on the
    document, which a response couldn't say.
  - Plain responses with the entry's text were rejected. Each session
    would resolve every registry schema it uses again.
  - It works because browser gives a plugin the response the session's
    `fetch` returned, not a copy that wouldn't have the document.
  - A layer on the stack was rejected. Browser checks `allowRetrieval`
    before the stack, so every URI a registry's schemas are found by
    would have to be allowed: all of them identified when a session is
    created, and parsed again for each session.
  - A URL a registry doesn't have is explained only if a schema in it is
    probably the one asked for: it's waiting for its dialect, or can't be
    identified, and its root's `$id` or `id` resolves to the URL. Then
    `get` throws, with that the dialect isn't defined
    (`ERR_DIALECT_NOT_DEFINED`) or the schema's problem, and nothing is
    retrieved instead. Any other miss keeps its own error, so a typo in a
    `$ref` isn't blamed on a registry. Rejected: making every failed
    retrieval in a session whose registry has such a schema an
    `AggregateError` of the failure and every one of them (see
    [JSON Schema as a media type](../api/json-schema-media-type.md#explaining-a-miss)).

- A schema is identified the way JSON Schema identifies it: by its `$id`
  (or `id` in draft-04), resolved against `retrievalUri`, or by
  `retrievalUri` if it has no `$id`. Only the root resource is indexed.
  Embedded resources are only found from the same document.
- A schema is also found by its `retrievalUri`, like a retrieved schema is
  found by the URI it was retrieved from. A reference to a schema by where
  it lives works even if the schema has a different `$id`, which the
  JSON-Schema-Test-Suite tests and a language server needs for references
  by relative path. Its `$id` is still its canonical URI, so locations use
  it.
- `without` takes the `retrievalUri`. A schema added without one can't be
  removed, and removing a `retrievalUri` that isn't there returns the same
  registry. Adding a `retrievalUri` that's already in the registry throws,
  so an edit is `without` then `with`. The constructor is for creating a
  registry in one step, like the test suite does.
- A schema is kept as JSON text. A value is stringified when it's added,
  so changing it afterward doesn't change the registry, and everything
  cached from an entry stays right. A value that can't be
  JSON, like one with a cycle, throws then instead of when a session finds
  it. Identifying and resolving a value costs a `JSON.parse` of its text
  instead of reading the value. Rejected: keeping the value, which a caller
  could change, and `structuredClone`, which copies a value only to
  stringify it later.
- A schema added as a value has no positions. Its text is made by the
  registry, so a line and column in it aren't anywhere the schema's author
  could find. It's resolved from `JSON.parse` and `fromJs`, a tree without
  positions, instead of browser's parser, which builds one with them, so
  neither its problems nor lint's messages about it have a `place`. Text
  made by `JSON.stringify` is always valid JSON, with no comments or
  duplicate names, so `JSON.parse` reads it as the parser does. Building
  the tree is 4 to 10 times as fast, which made compiling a large schema
  about a quarter faster (see
  [Registry values](../../benchmarks/registry-values.md)). Text added as
  text is parsed with positions, as before.
  - The entry says it was a value with `stringified`, a property that isn't
    enumerable. Entries are what iterating a registry gives, and
    `SchemaRegistryEntry` doesn't have it. Rejected: a documented field,
    which adds to the API only to say how an entry is parsed, and a
    `WeakSet` of entries beside `createdEntries`, which is state that
    isn't on the entry it's about.
  - Rejected: resolving a value without positions, and again from its
    text if it has a problem, so its problems have positions. They'd be
    positions in text its author never saw, and the docs say a value's
    messages have none.
- A registry entry can't be identified by a `file:` URI: `retrievalUri`
  can't be one, and neither can its `$id`. A schema in a file is retrieved
  from the file, so a `file:` URI only ever comes from browser. Rejected:
  allowing a `file:` `retrievalUri` because the code calling `with` is
  trusted.
- An entry's `origin` says where it came from, like the path of the file a
  tool read it from. It's never used to find or identify the entry. It's
  on the entry's document and every problem found in it, so a tool can
  show them where they are. A schema that's found both by its `$id` from a
  registry and by its path from browser is two documents, and `origin` is
  what maps the registry's copy back to its file. Rejected: one document
  for both, which needs a registry entry to be something browser reads, or
  browser's cache to know about registries.
- A session sees one registry, its config's `registry`. An operation
  combines the config's, for schemas every call sees, like custom
  meta-schemas, with its `registry` option, with `concat`, before it makes
  the session. So a schema in either can use a dialect a schema in the
  other defines. A registry's index is cached for the definitions by the
  registry, so a session doesn't index a registry another one already
  did. A config and its own registry, or a session's, are combined for
  each call, so a call's index is made again from cached identifications.
  Rejected: a registry property changed by assigning a new registry, with
  a session that looks in two registries, its own index borrowing dialects
  from the other's, so only the session's can use the other's dialects.
  Rejected: no registry in the config at all, which makes every call pass
  its meta-schemas. Rejected: lists of registries (`addRegistry`,
  `removeRegistry`, and a `registries` option). Two registries with a
  schema identified by the same URI are an error, so a list is one
  registry split up.
- `concat` combines registries, like a workspace's and generated ones.
  Entries are shared, not copied, so what's cached from them carries over,
  and an entry two of them share (because both were made from one
  registry with `with`) is in the result once. Two different entries with
  the same `retrievalUri` throw, like `with`. A registry iterates over its
  entries, with each schema as JSON text, so a tool can list or filter
  them, and passing them to the constructor shares them too. Rejected:
  iteration without `concat`, and `concat` without iteration, which leaves
  no way to list what's in a registry.
- Lookup order is: embedded resources, the registry, then browser (the
  session's documents, then the stack, with its HTTP cache if it has
  one). Two entries found by the same URI are an error when the URI is
  looked up, so a
  session's registry can't replace a schema in the config's. It's a
  `SchemaError` with a `duplicate-id` problem in each entry, at its `$id`
  or `id` if that's what the URI found it by, with its `origin`. Two with the
  same `retrievalUri` are an error when `concat` combines them, the first
  time the session uses the registry. A registry can't check that itself,
  because identity depends on the dialect, and it means a language server
  can have two files with the same `$id` for a moment without an
  exception. A resource embedded in a document can have the URI of
  another schema. It's only found from its own document, and what
  combines the two checks that they're identical (see
  [Schema AST](../../specs/schema-ast.md)).

- A problem that's one entry's is a `SchemaError` on that entry, with
  its `origin`, like a retrieved document's problems, so a tool can show
  which file to fix. That's two entries found by the same URI, and an
  entry that can't be identified, like one with a `file:` `$id`, when a
  lookup misses the URI it's probably identified by. The entry's
  identifier is its `uri`. Rejected: a plain `Error`, which couldn't say
  where the problem is. A dialect that isn't defined yet stays an `Error`
  with `ERR_DIALECT_NOT_DEFINED`, because it isn't a problem in the entry.

## Known limitations

- An entry with no identifier and no `retrievalUri` is never found and
  never reported. A `SchemaMessage` needs a `uri`, and nothing could look
  it up to report it. `with` can't refuse it, because whether a schema has
  an identifier depends on its dialect.

- Copying a registry's entries for `with` and indexing the new registry is
  O(n). That's fast for a language server's workspace. If it shows up in
  a profile, an index could build on its parent's index.

- There's no way to list the URIs a registry's entries are identified by,
  for something like a language server's "go to schema". A registry can't
  do it, because identification depends on the dialect, so it would be a
  function of a config and a registry (`identify(config, registry)`),
  built on the index the definitions already have. It's left until
  something needs it.

## Contents

- [Identification](identification.md)
- [Making sessions cheap](cheap-sessions.md)
