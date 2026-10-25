# Identification

Identity depends on the dialect, so a registry can't index its own
entries. Each `JsonSchema` indexes each registry it's used with.

- A `JsonSchema` identifies a registry's entries the first time a session
  looks for a schema in it, not when the session is created, so a session
  that never looks doesn't pay for it. Identification is synchronous: it
  gets the dialect and runs only the root's resolve hooks (`identify` in
  `src/registry/registry-index.js`). Full resolution comes later, separately.
- An entry is parsed with `JSON.parse` to identify it, and only the root
  keywords whose resolve hooks run are made into nodes (with `fromJs`). A
  tree with positions is much slower to build and is only needed for a
  problem, so an entry that has one is parsed again into a tree, and the
  problem has a position (see hjlint's
  [Workspace registry](https://github.com/hyperjump-io/hjlint/blob/main/design/benchmarks/workspace-registry.md) benchmark).
- An entry that can't be identified, such as one that isn't valid JSON or
  has an invalid `$id`, is found by its `retrievalUri`, and finding it
  resolves it, which throws a `SchemaError` with that problem and any
  others, like a retrieved file with problems. One
  without a `retrievalUri` can't be found, so its problem is reported when
  a lookup misses.
- An entry's dialect is one added to the `JsonSchema` or one defined by
  another entry in the same registry (its root's `defineDialect` effect).
  Only the same registry, because an index doesn't depend on which other
  registries a session sees. A schema in a registry that uses a
  `$vocabulary` dialect needs that dialect's meta-schema in the same registry
  or added with `addDialect`.
- An entry whose dialect isn't defined yet waits in a list by dialect URI.
  Nothing is retrieved to identify an entry. Waiting entries are tried
  again once the rest of the registry is identified and when a lookup
  misses, so a dialect added with `addDialect` later is picked up. The
  dialects they're waiting for are in the error when the lookup fails.
  Until then, a waiting entry is found by its `retrievalUri`. Resolving it
  gets its dialect with `JsonSchemaSession.getDialect`, which can find the
  meta-schema anywhere.
- A session sees a dialect defined by an entry exactly when it sees the
  entry, because the dialect comes from the entry's resolved document. A
  registry without the entry doesn't have the dialect.
- Full resolution is lazy, the first time a session asks for the entry.
  Problems are thrown in a `SchemaError` then, as they are for a retrieved
  schema.

## Known limitations

- A registry schema can only be identified with a dialect added to the
  `JsonSchema` or defined by a meta-schema in the same registry, because
  identification is synchronous and never retrieves. If its dialect is
  defined by a meta-schema in a different registry or one that's only
  retrievable, it's found by its `retrievalUri` but not by its `$id`.
  Identifying entries per session, across all of its registries, would fix
  that, but then an index would depend on more than its registry, and
  sessions wouldn't be cheap.
