# The API as functions

Everything is a function, not a method, so bundles only have what's
imported (see [Bundle size](../../benchmarks/bundle-size.md)).

What decides how schemas are read is a config: browser's, with the JSON
Schema media types in its `mediaTypes`, which carry the definitions
(dialects, keywords, formats), and a `registry` (see
[JSON Schema as a media type](json-schema-media-type.md)). Everything done
with schemas, like validating, annotating, bundling, and linting, is a
function that takes the config, and starts a session of its own. A session
is a `Hyperjump`, and browsing is functions of it (see
[Sessions](../sessions/README.md)).

```js
import { BASIC, jsonSchemaConfig, SchemaRegistry, validate, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const config = jsonSchemaConfig({ dialects: [v1Dialect] });

await validate(config, schema, data);

const registry = new SchemaRegistry().with(addressSchema).with(personSchema);
const isPerson = await validator(config, "https://example.com/person", { registry, output: BASIC });
isPerson(data);
```

- An operation that isn't imported isn't in a bundle. Methods on a class
  can't be tree-shaken, so a bundle that only validates would have
  bundling, linting, and every output format in it.
- A third party's operation is written the same way as ours, against the
  same public API (see [Public API](public-api.md)), without subclassing.
  An operation that isn't about JSON Schema, like bundling JRef, can take
  a `Hyperjump` instead, so one that works for several media types doesn't
  need a class hierarchy.
- The simple path is short: make a config with a dialect, then
  validate. A schema can be passed as a value, so a registry is only
  needed for schemas that reference each other.

## The definitions

The JSON Schema media type's `definitions` are frozen tables by URI:
`keywords`, `formats`, `dialects`, and `vocabularies` (see
[JSON Schema as a media type](json-schema-media-type.md)). The tables have
no prototype, so a URI like `constructor` isn't found in them.

- Code reads the tables. Where a missing definition is an error, like
  compiling, restoring, and resolving, `keywordOf` and `formatOf`
  (`src/definition-of.js`) throw it. `lowerKeywords` takes the keywords
  instead of a function that finds one.
- `jsonSchemaConfig`'s type is a generic function (see
  [Schema types](../schema-types.md)).
- The registry is in the config (see [Registries](../registries/README.md)).
- Rejected: `has` and `get` methods for each kind of definition, and
  functions of the config in their place (`getKeyword(config, uri)`).
  They'd be lookups in the tables, and the functions would be the methods
  moved.
- Rejected: a second way to make a session, like a `session()` method. A
  session is `new Hyperjump(config)`.

Known limitations:

- `dialects` and `vocabularies` are by `Id`, so a URI from a schema has to
  be normalized to find one. The library's own code already has an `Id`
  there. Outside it, `getDialect(session, uri)` normalizes.

## Rejected

- Mixins, a `Hyperjump` built up with `.use(validation)`,
  `.use(bundling)`, and so on. They have the same benefits, but the types
  are hard (each `use` has to add to the type, and declaration merging
  would add every method to every instance), features share state, so
  they depend on each other and on the order they're added in, and two
  mixins that both wrap `get` depend on that order. Registering
  things (dialects, keywords, formats) doesn't depend on order, and that's
  what's in the config.
- A default instance, ready to use from each dialect's entry point
  (`import { validate } from "@hyperjump/json-schema/v1"`). It's shared
  mutable state: two libraries using it would see each other's
  definitions and registries (see [No global state](../../principles/no-global-state.md)).
  The simple path costs one more line instead.
- Keeping the methods as shortcuts for the functions. Every operation
  would have two spellings, and the class would import every operation,
  which defeats tree-shaking.

## Contents

- [Public API](public-api.md): what third parties can build on
- [JSON Schema as a media type](json-schema-media-type.md): putting the
  definitions on the media type plugin and registries in browser

How the parts work is in their components:

- [Validation API](../validation-api/README.md): the operations, their
  options, contexts, and schemas passed as values
- [Dialects](../dialects/README.md) and
  [Built-in dialects](../built-in-dialects/README.md): the config, and
  dialects that carry their definitions
- [Schema types](../schema-types.md): schema types from the config
- [Registries](../registries/README.md): one per call, one on the
  instance, and combining them
- [Output formats](../kernel/output-formats.md): output formats as values
