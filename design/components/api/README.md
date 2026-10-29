# The API as functions

Decided 2026-10-29 and not built yet. Until each stage of the plan in
`TODO.md` lands, the other component documents describe the code as it is,
and each stage updates the ones it changes.

`JsonSchema` keeps what decides how schemas are read: its definitions
(dialects, keywords, formats), its registry, the `getDocument` override,
and sessions. Everything done with schemas, like validating, annotating,
bundling, and linting, is a function that takes a `JsonSchema` or a
`JsonSchemaSession`.

```js
import { JsonSchema, SchemaRegistry, validate, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";
import { BASIC } from "@hyperjump/json-schema/output";

const jsonSchema = new JsonSchema({ dialects: [v1Dialect] });

await validate(jsonSchema, schema, data);

const registry = new SchemaRegistry().with(addressSchema).with(personSchema);
const isPerson = await validator(jsonSchema, "https://example.com/person", { registry, output: BASIC });
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
- The simple path is short: create a `JsonSchema` with a dialect, then
  validate. A schema can be passed as a value, so a registry is only
  needed for schemas that reference each other.

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

- [Operations](operations.md): the functions, their options, and schemas
  passed as values
- [Definitions](definitions.md): the config, dialects that carry their
  definitions, and schema types from the config
- [Registries](registries.md): one per call, one on the instance, and
  combining them
- [Public API](public-api.md): what third parties can build on
