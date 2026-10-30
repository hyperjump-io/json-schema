# Making sessions cheap

Creating a session costs nothing for a registry that's been used before,
and a registry that's one edit away from another is cheap to index.

- An entry never changes, and `with`, `without`, and `concat` carry the
  same entry objects into the new registry, as does the constructor given
  another registry's entries. Everything derived from an entry is cached
  once per `JsonSchema` (a `WeakMap` keyed by the entry) and shared by every
  registry and session: its identification and, lazily, its resolved
  document. An identification that used a dialect from another entry isn't
  cached, because it depends on the registry. A resolved document is only
  shared if every resource in it uses a dialect added to the `JsonSchema`.
  One that used a dialect only its session had belongs to that session.
- A `JsonSchema` builds an index (URI to entry) for each registry the first
  time a session uses it, and keeps it in a `WeakMap` keyed by the registry.
  A session's own registry can use dialects from the `JsonSchema`'s
  registry, so its index is also keyed by that registry's index.
  Sessions point at the indexes. A new registry from `with` or `without`
  gets a new index, which only identifies the new entry. The rest is
  copying cached identifications into a `Map`.
- An old registry, its index, and the sessions that use it are garbage
  collected when nothing refers to them. Nothing keeps track of open
  sessions.
- What a session still builds itself is its document cache and embedded
  index for what it actually uses, plus anything that depends on a dialect
  only that session has.
- A cached identification or resolved document reflects the definitions
  when it was made. A later `addKeyword` or `extendDialect` doesn't change
  it, as with any schema that's already been resolved.
