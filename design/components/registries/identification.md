# Identification

Identity depends on the dialect, so a registry can't index its own
entries. It's indexed for each set of definitions it's used with, the JSON
Schema media types' (see
[JSON Schema as a media type](../api/json-schema-media-type.md)).

- A registry's entries are identified the first time a session
  looks for a schema in it, not when the session is created, so a session
  that never looks doesn't pay for it. Identification is synchronous: it
  gets the dialect and runs only the root's resolve hooks (`identify` in
  `src/registry/registry-index.js`). Full resolution comes later, separately.
- An entry is parsed with `JSON.parse` to identify it, and only the root
  keywords whose resolve hooks run are made into nodes (with `fromJs`). A
  tree with positions is much slower to build and is only needed for a
  problem, so an entry added as text that has one is parsed again into a
  tree, and the problem has a position (see the CLI's
  [Workspace registry](https://github.com/hyperjump-io/cli/blob/main/design/benchmarks/workspace-registry.md) benchmark).
  An entry added as a value isn't, because a value has no positions (see
  [Registries](README.md)).
- An entry that can't be identified, such as one that isn't valid JSON or
  has an invalid `$id`, is found by its `retrievalUri`, and finding it
  resolves it, which throws a `SchemaError` with that problem and any
  others, like a retrieved file with problems. One
  without a `retrievalUri` can't be found, so its problem is reported when
  a lookup misses.
- An entry's dialect is one in the definitions or one defined by another
  entry in the same registry (its root's `defineDialect` effect). A
  session sees one registry, the config's combined with the call's, so a
  custom meta-schema in the config's registry identifies the call's
  schemas, and the other way around. An index is cached for the
  definitions by the registry (`WeakMap<definitions, WeakMap<registry,
  RegistryIndex>>`). Entries identified with a dialect from a registry
  aren't shared between indexes. A schema an operation is given as a
  value is added to the call's registry, so it can use the dialects the
  registry's meta-schemas define, and the other way around.
- An entry whose dialect isn't defined yet waits in a list by dialect URI.
  Nothing is retrieved to identify an entry. Waiting entries are tried
  again once the rest of the registry is identified. The definitions'
  dialects never change, so that's the last time. The dialects they're
  waiting for are in the error when the lookup fails.
  Until then, a waiting entry is found by its `retrievalUri`. Resolving it
  gets its dialect with `getDialect(session, uri)`, which can find the
  meta-schema anywhere.
- A session sees a dialect defined by an entry exactly when it sees the
  entry, because the dialect comes from the entry's resolved document. A
  registry without the entry doesn't have the dialect.
- Full resolution is lazy, the first time a session asks for the entry.
  Problems are thrown in a `SchemaError` then, as they are for a retrieved
  schema.

## Known limitations

- A registry schema can only be identified with a dialect in the
  definitions or defined by a meta-schema in the registry the session
  sees, because identification is synchronous and never retrieves. If its
  dialect's meta-schema is only retrievable, it's found by its
  `retrievalUri` but not by its `$id`.
