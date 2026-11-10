# Registries (`SchemaRegistry`)

A registry holds schemas that aren't retrieved from a URI. It's separate
from `JsonSchema` so one registry can be shared by several `JsonSchema`s and
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

Implemented in `src/registry/schema-registry.js`, with each `JsonSchema`'s
index of a registry in `src/registry/registry-index.js`. A registry's
entries are in `src/registry/registry-entries.js`, which isn't exported. How
a session finds schemas in the registries it sees is in
`src/registry/session-registries.js`.

- The registries are a layer on top of the session's stack
  (`JsonSchemaSession.fetch`), so a schema in one is found before anything
  is retrieved or checked by `allowRetrieval`, including where a redirect
  leads. A registry is keyed by IRI, so the layer works out the `Id` of
  the request's URL.
  - It answers with a `DocumentResponse`, a response that has the resolved
    document (`src/registry/document-response.js`), and the schema media
    type plugin gives the session that document. An entry is resolved once
    for every session that can share it (see
    [Making sessions cheap](cheap-sessions.md)), and its `origin` is on the
    document, which a response couldn't say.
  - Plain responses with the entry's text were rejected. Each session
    would resolve every registry schema it uses again.
  - It works because the layer is on top, so nothing between it and the
    plugin makes a new response that wouldn't have the document.

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
  so changing it afterward doesn't change the registry, and everything a
  `JsonSchema` caches from an entry stays right. A value that can't be
  JSON, like one with a cycle, throws then instead of when a session finds
  it. Resolving a schema always parsed text, so only identifying a value
  costs more: `JSON.parse` instead of reading the value. Rejected: keeping
  the value, which a caller could change, and `structuredClone`, which
  copies a value only to stringify it later.
- A registry entry can't be identified by a `file:` URI: `retrievalUri`
  can't be one, and neither can its `$id`. A schema in a file is retrieved
  from the file, so a `file:` URI only ever comes from browser. Before
  2026-10-27, `retrievalUri` could be one, because the code calling `with`
  is trusted, and the CLI's workspace registry used them.
- An entry's `origin` says where it came from, like the path of the file a
  tool read it from. It's never used to find or identify the entry. It's
  on the entry's document and every problem found in it, so a tool can
  show them where they are. A schema that's found both by its `$id` from a
  registry and by its path from browser is two documents, and `origin` is
  what maps the registry's copy back to its file. Rejected: one document
  for both, which needs a registry entry to be something browser reads, or
  browser's cache to know about registries.
- A session sees two registries: its own (`session({ registry })`,
  `compile(uri, { registry })`, and the other operations' options) and the
  `JsonSchema`'s `registry` property, for schemas every session sees, like
  custom meta-schemas. The property starts empty, and changing it is
  replacing it with a new registry. A session has the one it was created
  with. There's no `registry` config, because the property covers it.
  Before 2026-10-29, there were lists of both: `addRegistry` and
  `removeRegistry` on `JsonSchema`, and a `registries` option. Two
  registries with a schema identified by the same URI were already an
  error, so a list was one registry split up.
- `concat` combines registries, like a workspace's and generated ones.
  Entries are shared, not copied, so what's cached from them carries over,
  and an entry two of them share (because both were made from one
  registry with `with`) is in the result once. Two different entries with
  the same `retrievalUri` throw, like `with`. A registry iterates over its
  entries, with each schema as JSON text, so a tool can list or filter
  them, and passing them to the constructor shares them too. Rejected:
  iteration without `concat`, and `concat` without iteration, which leaves
  no way to list what's in a registry.
- Lookup order is: embedded resources, the session's registry, the
  `JsonSchema`'s registry, then browser (the session's cache, the HTTP
  cache, a URI scheme plugin). Two entries found by the same URI are an
  error when the URI is looked up, whether they're in one registry or
  both, so a session's registry can't replace a schema every session
  sees. A registry can't check that itself,
  because identity depends on the dialect, and it means a language server
  can have two files with the same `$id` for a moment without an
  exception. A resource embedded in another document can only have the
  same URI if it's identical (see [Schema AST](../../specs/schema-ast.md)).

## Known limitations

- Copying a registry's entries for `with` and indexing the new registry is
  O(n). That's fast for a language server's workspace. If it shows up in
  a profile, an index could build on its parent's index.

## Open questions

- Listing the URIs a registry's entries are identified by, for something
  like a language server's "go to schema". A registry can't do it, because
  identification depends on the dialect, so it would be a function of a
  `JsonSchema` and a registry (`identify(jsonSchema, registry)`), built on
  the index each `JsonSchema` already has. It's left until something needs
  it.

## Contents

- [Identification](identification.md)
- [Making sessions cheap](cheap-sessions.md)
