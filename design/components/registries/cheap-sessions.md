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
- A cached identification or resolved document can't go stale, because
  the definitions are made once by `jsonSchemaMediaTypes` and never
  change. Before
  2026-10-29, a later `addKeyword` or `extendDialect` didn't change what
  was already cached.
