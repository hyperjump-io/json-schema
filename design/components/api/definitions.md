# Definitions

Part of [The API as functions](README.md). Decided 2026-10-29. The config
and dialects that carry their definitions were built the same day (stage
2). Vocabularies, which this didn't cover, became a `vocabularies` config,
and dialects carry theirs (see [Vocabularies](../dialects/vocabularies.md)).
Schema types from the config were built the same day too (stage 5, see
[Schema types](../schema-types.md)).

```js
import { JsonSchema, extendDialect } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";
import { fullFormats } from "@hyperjump/json-schema/formats/full";

const jsonSchema = new JsonSchema({
  dialects: [extendDialect(v1Dialect, { keywords: { even: evenKeyword } })],
  formats: fullFormats
});
```

## The config

- A `JsonSchema`'s dialects, keywords, and formats are in its config
  (`dialects`, `keywords`, `formats`) and can't change after it's
  constructed. `addDialect`, `removeDialect`, `addKeyword`, `addFormat`,
  and the `extendDialect` method are removed. `hasX` and `getX` stay.
- Definitions can't change under something cached from them, so the
  caveat that a later `addKeyword` or `extendDialect` doesn't change a
  schema that's already resolved goes away (see
  [Making sessions cheap](../registries/cheap-sessions.md)).
- Adding a dialect later, like one loaded with `import()` when a schema
  needs it, means creating another `JsonSchema`.
- Its `registry` can still be replaced (see [Registries](registries.md)).
- There's still no default dialect. One isn't inferred when there's only
  one dialect, because adding a second would change how schemas without
  `$schema` are read. `defaultDialectUri` stays.

## Dialects carry their definitions

- A dialect's `keywords` map names to `Keyword` objects, and its `formats`
  map names to `Format` objects. A URI string still works, and means the
  definition comes from somewhere else: the config's `keywords` or
  `formats`, like the formats that need Unicode data, which v1 names but
  doesn't include. A dialect built from a meta-schema only has URIs.
- Constructing a `JsonSchema` does what `addPreset` does now: it registers
  each definition a dialect brings that isn't registered yet, so one
  replaced through `keywords` stays replaced, and the same dialect twice is
  an error. It stores the dialect with URIs, the form it has now, so
  `getDialect` and what reads dialects don't change.
- Each dialect's entry point exports the dialect (`v1Dialect`,
  `draft202012Dialect`, …). `addV1`, `addDraft202012`, and the other
  preset functions, and `addPreset`, are removed. The preset's lists of
  definitions become the dialect's maps. `addFullFormats` is removed too,
  and `fullFormats` goes in the config's `formats`.
- The keywords that aren't full proposals yet (v1's `conditional`,
  `itemPattern`, `requireAllExcept`) go in v1's `keywords` under a comment.
  They were added with `extendDialect` as a reminder.
- `extendDialect(dialect, { keywords, formats })` is a function that
  returns a new dialect, which is passed in the config. It can't replace a
  keyword or a format, as before.
- A dialect isn't plain data anymore, because it holds definitions with
  functions. Nothing needed it to be: validators don't serialize dialects,
  and dialects from meta-schemas are built internally.
- Rejected: a separate preset value (`{ dialect, keywords, formats }`) for
  each dialect, which was only needed because a dialect named its keywords
  by URI. Keeping `addV1` for unified pipelines: a unified plugin's `this`
  is the processor, not a `JsonSchema`, and a pipeline that needs dialects
  is given a `JsonSchema` that has them, like lint's rules are.

## Schema types from the config

- `JsonSchema` is generic over its dialects' schema types, inferred from the
  config: `new JsonSchema({ dialects: [v1Dialect, draft07Dialect] })` is a
  `JsonSchema<V1Schema | Draft07Schema>`. A schema passed as a value to an
  operation is checked against that union. A URI isn't checked.
- That's possible because a dialect's keywords are `Keyword` objects, which
  carry their types (`SchemaOf` reads them). `extendDialect` has to keep
  the types of the keywords it adds.
- `SchemaRegistry<S>` still takes a type, which can come from the
  `JsonSchema`.
- Rejected: a type argument on each call (`validate<V1Schema>(…)`), which
  leaves the simple path unchecked.
