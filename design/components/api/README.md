# The API as functions

Decided and built 2026-10-29, replacing methods on `JsonSchema`,
`JsonSchemaSession`, and `Validator`, and setup methods like `addV1` and
`addKeyword`. Bundles shrank as a result (see
[Bundle size](../../benchmarks/bundle-size.md)).

What decides how schemas are read is a config: browser's, with the JSON
Schema media types in its `mediaTypes`, which carry the definitions
(dialects, keywords, formats), and a `registry` (see
[JSON Schema as a media type](json-schema-media-type.md)). Everything done
with schemas, like validating, annotating, bundling, and linting, is a
function that takes the config, and starts a session of its own. A session
is a `Hyperjump`, and browsing is functions of it (see
[Sessions](../sessions/README.md)).

```js
import { BASIC, jsonSchemaMediaTypes, SchemaRegistry, validate, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const config = { mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }) };

await validate(config, schema, data);

const registry = new SchemaRegistry().with(addressSchema).with(personSchema);
const isPerson = await validator(config, "https://example.com/person", { registry, output: BASIC });
isPerson(data);
```

- An operation that isn't imported isn't in a bundle. Methods on a class
  can't be tree-shaken, so a bundle that only validates had bundling,
  linting, and every output format in it.
- A third party's operation is written the same way as ours, against the
  same public API (see [Public API](public-api.md)), without subclassing.
  An operation that isn't about JSON Schema, like bundling JRef, can take
  a `Hyperjump` instead, so one that works for several media types doesn't
  need a class hierarchy.
- The simple path is short: make a config with a dialect, then
  validate. A schema can be passed as a value, so a registry is only
  needed for schemas that reference each other.

## `JsonSchema` as a value

Decided and built 2026-11-14, and replaced the same day by stage 1 of
[JSON Schema as a media type](json-schema-media-type.md): the definitions
went onto the media type plugin, and the config is browser's. What follows
is still how sessions and the definitions' lookups work.

`configureJsonSchema(config)` returned a frozen value instead of a class's
instance: the config, with its `registry`, the stack, and the definitions
by URI in `keywords`, `formats`, `dialects`, and `vocabularies`, which the
media type's `definitions` are now. The tables have no prototype, so a URI
like `constructor` isn't found in them. A session was
`new JsonSchemaHyperjump(jsonSchema)`, and is browser's,
`new Hyperjump(config)` (see [JSON Schema as a media type](json-schema-media-type.md)).

- The names say what each makes. The argument to `configureJsonSchema` is
  configuration, not a schema, which `createJsonSchema` made it sound
  like. A session is a subclass of browser's `Hyperjump` (see
  [Sessions](../sessions/README.md)), so it's constructed like one, and
  the class is its type. Rejected: `hyperjump(config)` for the
  `JsonSchema`, since browser's `Hyperjump` is a session and it isn't one;
  `configure`, which is too generic; `configureHyperjump`, which suggests
  it makes a `Hyperjump`; `hyperjumpJsonSchema` with `hyperjumpSession`,
  which are long; and `createSession` or `startHyperjump`, a function
  that only calls the constructor, with a separate `JsonSchemaSession`
  type for the class.

- It removed `session()`, a second way to make a session, and seven
  `has` and `get` methods that were lookups in those tables. What they
  added, the error for a keyword or format that isn't defined, is
  `keywordOf` and `formatOf` (`src/definition-of.js`), used where a
  missing definition is an error: compiling, restoring, and resolving.
  `lowerKeywords` takes the keywords instead of a function that finds one.
- Its type is a generic function instead of a constructor type with a
  second signature for subclasses (see [Schema types](../schema-types.md)).
- The registry is in the config, instead of a property that's assigned
  (see [Registries](../registries/README.md)). Rejected: a `withRegistry`
  that returns a copy with another registry. What's cached for a
  `JsonSchema` (registry entries' identifications, registry indexes, and
  resolved entries) is keyed by it, so each copy would start those caches
  empty, or they'd have to be keyed by its tables instead.
- Rejected: functions of a `JsonSchema` in place of the methods
  (`getKeyword(jsonSchema, uri)`). They'd be the methods moved.

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
  mixins that both wrap `getDocument` depend on that order. Registering
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
  definitions on the media type plugin and registries in browser, decided
  and not built yet

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
