# Making sessions cheap

Creating a session costs nothing for a registry that's been used before,
and a registry that's one edit away from another is cheap to index.

- An entry never changes, and `with`, `without`, and `concat` carry the
  same entry objects into the new registry, as does the constructor given
  another registry's entries. Everything derived from an entry is cached
  once for each set of definitions (a `WeakMap` keyed by the entry) and shared by every
  registry and session: its identification and, lazily, its resolved
  document. An identification that used a dialect from another entry isn't
  cached, because it depends on the registry. A resolved document is only
  shared if every resource in it uses a dialect in the definitions.
  One that used a dialect only its session had belongs to that session.
- An index (URI to entry) of the registry a session sees is built the
  first time a session uses it, and kept for the definitions in a
  `WeakMap` keyed by the registry, so sessions with the same registry share
  it. An operation combines the config's registry with its own for each
  call, so when both have one, the combined registry is new each time, and
  its index copies the cached identifications again. Sessions point at the
  indexes. A new registry from `with` or `without`
  gets a new index, which only identifies the new entry. The rest is
  copying cached identifications into a `Map`.
- An old registry, its index, and the sessions that use it are garbage
  collected when nothing refers to them. Nothing keeps track of open
  sessions.
- What a session still builds itself is its document cache and embedded
  index for what it actually uses, plus anything that depends on a dialect
  only that session has.
- The caches (`identifications`, `registryIndexes`, and
  `sharedDocuments`) are module-level `WeakMap`s keyed by the
  definitions. They're memos of pure functions of values that never
  change, so they can't change a result, the way a hidden input would.
  Rejected: keeping them on the definitions, which are plain and
  stateless (see [No global state](../../principles/no-global-state.md)),
  on a session, which wouldn't share them, or on the registry or the
  `JsonSchema`, which would need the same maps keyed by the other.
- A cached identification or resolved document can't go stale, because
  the definitions are made once by `jsonSchemaConfig` and never
  change. Rejected: definitions that can be added later, like with
  `addKeyword`, which wouldn't change what's already cached.
