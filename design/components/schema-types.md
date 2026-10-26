# Schema types (`SchemaOf`, `KeywordValue`)

A schema written in TypeScript is checked against a type for its dialect,
so a misspelled keyword or a value of the wrong type is an error as it's
written. Custom keywords are part of the type.

- **A keyword's value type comes from its definition.** `Keyword<V, Sh, S>`
  has the type of its shape (`Sh`) as well as the value `lower` gets (`V`).
  `KeywordValue<K, S>` walks a literal `Sh`: `"schema"` and
  `"unappliedSchema"` are `S`, the schema type, `"reference"` is a string,
  `{ array }` and `{ map }` are readonly arrays and objects, and `"data"` is
  the matching part of `V`, deeply readonly, with expressions and
  references excluded. `V` is walked alongside `Sh`: a map's pairs give the
  type of its values, and an array's items its items. A keyword whose shape
  isn't a literal type, or whose `V` is `any`, gets `unknown` or `Json`.
- **The schema type is passed in.** That's how a custom keyword's
  subschemas are schemas of the dialect it's in, including its other custom
  keywords, without higher-kinded types. A keyword doesn't know its
  dialect, so its type can't name the schema type.
- **An alternative only gets the JSON types the others don't take.** The
  resolver picks an alternative by the value's JSON type, so a `"data"`
  alternative next to an array or map alternative leaves arrays out of
  `V`. Without that, `itemPattern`'s groups were also data, and the
  recursive type expanded forever.
- **`SchemaOf<K, Uri, U>`** maps a dialect's keyword names to their
  definitions' types (`K`). `$schema` is `Uri`, as in every dialect. When
  unknown keywords are errors (`U` is `"error"`), only `x-` names can be
  added, with any value. Otherwise, any name can.
- **Presets declare their dialect's types.** `V1Keywords` lists each
  keyword's type by name, and `V1Schema<Extension>` adds custom keywords by
  intersection. Keyword definitions aren't public, so the list is written
  in `v1/index.d.ts`, like the preset's own list of keywords.
  `schema-type.test-d.ts` checks that it matches the definitions, and that
  schemas that should and shouldn't fit do. tsc checks it. Vitest doesn't
  run it.
- **A registry has the type of the schemas it takes.**
  `SchemaRegistry<S = ReadonlyJson>` checks what `with` and the constructor are
  given, and the registries `with` and `without` return keep `S`. A union
  takes more than one dialect. The constructor's entries don't infer `S`
  (`NoInfer`), or a registry made from entries would only take schemas
  like them. Where a registry is used (`addRegistry`, `registries`), it's
  `SchemaRegistry<any>`, because a `SchemaRegistry<V1Schema>` isn't a
  `SchemaRegistry<Json>`: neither schema type is assignable to the other.
- **What's only read is `ReadonlyJson`** (from `@hyperjump/browser/json`):
  a registry's schemas, the instance `validate` and `annotate` get, and
  `restoreValidator`'s compiled schema. So is what a format, a keyword's
  `InstanceOps.value`, and a plugin's `value()` get, because for a JS
  value that's the caller's instance. `Json` is assignable to it, so
  nothing that worked stops working. What's returned, like `serialize()`
  and `bundle()`, stays `Json`, because it's a new value the caller owns.
  The validator casts the instance to `Json` where it comes in, because
  evaluation only reads it.
- **Keyword definitions are annotated with their shapes**
  (`@type Keyword<number, "data">`), so their types can be checked against
  the preset's list. That's also how a custom keyword gets its type:
  `satisfies Keyword<V>` keeps `shape` as written.

## Rejected

- **Declaration merging** (a global interface of keyword types by URI, or
  of dialects). Types would be global, like v1's state was (see
  [No global state](../principles/no-global-state.md)): two parts of an
  application couldn't extend v1 differently. An interface's property also
  can't be extended per dialect.
- **`extendDialect` changing the instance's type.** A mutation can't change
  a type, and `asserts this is` is fragile.
- **A type-only description of each keyword** (`{ shape, data }`). It's
  simpler, but every custom keyword would have to declare it as well as its
  definition, and nothing would check that they agree.
- **Choosing a registry schema's type by its `$schema`.** It would need
  the dialect URIs mapped to types, globally, and a v1 schema with a custom
  keyword would be an error unless the map knew it.
- **A type argument on each `with`.** `satisfies` already does that, and a
  registry usually holds one dialect.
- **v1's approach**, a hand-written schema type per dialect. Custom
  keywords couldn't be added, and nothing checked it against the keywords.

## Known limitations

- What a keyword's `check` reports, like a negative `minLength`, isn't in
  the type.
- `format` is any string, because whether formats validate is
  configuration.
- The whole schema is one dialect, so an embedded schema resource with a
  different `$schema` doesn't fit.
- `"data"` types are only as precise as `V`. A keyword with no `lower` still
  needs one for its value type.
- JSDoc can't declare a recursive union, so `itemPattern.js` types its rules
  loosely. The precise type is in `v1/index.d.ts`.
- A dialect built from a meta-schema's `$vocabulary` has no type unless
  someone writes its keyword map.

## Open questions

- Types for the other presets (2020-12, 2019-09, draft-04 through
  draft-07). Their unknown keywords are annotations, so their types are
  open.
- Whether `format` should be a union of the dialect's format names when
  formats validate.
