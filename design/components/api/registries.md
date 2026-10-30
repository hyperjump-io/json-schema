# Registries

Part of [The API as functions](README.md). Decided 2026-10-29, and built
the same day (stage 1), except that operations are still methods. How
registries work is in [Registries](../registries/README.md).

```js
const registry = workspace.concat(generated);
await validate(jsonSchema, "https://example.com/person", data, { registry });

// Schemas every call sees, like custom meta-schemas
jsonSchema.registry = jsonSchema.registry.with(myMetaSchema);
```

## One per call

- The usual way to give an operation schemas is its `registry` option.
  `SessionOptions` becomes `{ registry?, allowRetrieval? }`.
- It's one registry, not a list. Two registries with a schema identified by
  the same URI are already an error, so a list is one registry split up,
  and one is one index to look in.
- `a.concat(b, …)` combines registries into a new one. The same
  `retrievalUri` in two of them throws, like `with`. Entries are shared,
  not copied, so what's cached from them carries over.
- A registry is iterable over its entries (`SchemaRegistryEntry`, the type
  the constructor already takes), so `new SchemaRegistry([...a, ...b])`
  works too and a tool can list or filter what's in one. An entry's
  `schema` is JSON text, because a registry stringifies values.
- Rejected: iteration only, without `concat`; `concat` only, which leaves
  no way to list a registry's schemas.
- Not decided: listing the URIs a registry's entries are identified by,
  for something like a language server's "go to schema". A registry can't
  do it, because identification depends on the dialect, so it would be a
  function of a `JsonSchema` and a registry
  (`identify(jsonSchema, registry)`), built on the index each `JsonSchema`
  already has. It's left until something needs it.

## One on the instance

- `JsonSchema` has one `registry` property, empty to start, for schemas
  every session sees, like custom meta-schemas. It replaces `addRegistry`
  and `removeRegistry`, and there's no `registries` config. Changing it is
  replacing it with a new registry (`with`, `without`, `concat`). Sessions
  have a snapshot of it from when they were created, and caches are keyed
  by registry, so replacing it costs nothing.
- Lookup order is the session's embedded resources, the call's registry,
  the instance's registry, then browser. A URI that both registries
  identify is an error, as now, so a call can't replace a schema every
  call sees.

## Dialects from the instance's registry

- A schema in a call's registry can use a dialect defined by a
  meta-schema in the instance's registry, which is what the idiom above
  needs. Now an entry can only use a dialect added to the `JsonSchema` or
  defined in the same registry (see [Identification](../registries/identification.md)).
- A call registry's index then depends on the instance's registry too, so
  indexes are cached by both:
  `WeakMap<instanceRegistry, WeakMap<callRegistry, RegistryIndex>>`.
  Replacing the instance's registry makes new indexes the next time
  they're used. That should be rare, so sessions stay cheap.
- Using dialects from any other registry a session sees is still rejected,
  for the reason in Identification: an index would depend on every
  registry a session has.
