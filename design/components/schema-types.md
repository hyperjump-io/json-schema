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
  definitions' types (`K`). `$schema` is `Uri`, as in every dialect, or
  `Uri` with an empty fragment, which draft-04 through draft-07 schemas
  usually have. When unknown keywords are errors (`U` is `"error"`), only
  `x-` names can be added, with any value. Otherwise, any name can, so a
  misspelled keyword isn't an error, but the dialect's keywords' values
  are still checked. That's what those dialects say: an unknown keyword is
  allowed.
- **Built-in dialects declare their types.** `V1Keywords` lists each
  keyword's type by name, and `V1Schema<Extension>` adds custom keywords by
  intersection. Every built-in dialect has the same pair (`Draft202012Keywords` and
  `Draft202012Schema`, and so on). Keyword definitions aren't public, so
  each list is written in the dialect's `index.d.ts`, like the dialect's
  own map of keywords. Each dialect's `schema-type.test-d.ts` checks that its
  list matches the definitions, and that schemas that should and shouldn't
  fit do. tsc checks them. Vitest doesn't run them.
- **A union of dialects is told apart by `$schema`.** A schema with a
  dialect's `$schema` only fits that dialect's type. One without `$schema`
  fits any of them, so with an open dialect in the union, a misspelled
  keyword fits that one.
- **A config has its dialects' schema types.** A dialect given to
  `jsonSchemaConfig` is a `DialectConfig<K, Uri, U>`, with its keyword map, so
  `DialectSchema<D>` is `SchemaOf` of its keywords' types. A keyword named
  by a URI has no type, so any value fits it. The built-in dialects are
  declared with their keyword lists (`DialectConfig<V1Keywords, …>`), so
  tsc checks that the definitions in `dialect.js` fit them, as well as the
  `schema-type.test-d.ts` files. `jsonSchemaConfig({ dialects })`
  returns a config whose JSON Schema media type is a `SchemaMediaType<S>`
  with the union of their types, and without dialects it's `AnySchema`. A
  config with it in its `mediaTypes` is a `JsonSchemaConfig<S>`: an
  operation infers `S` from the plugin in the list, whatever else is in
  it. The plugin carries `S` in a property that's
  only in its type (`[schemaType]`), which nothing reads at runtime.
  `extendDialect` returns `DialectConfig<K & E, …>`, so the keywords it adds
  are in the type. A session is a `Hyperjump<C>`, with its config's type, so its media types are in the type of what it finds (see
  [Sessions](sessions/README.md)).
- **A schema an operation is given as a value is checked.** `validate`,
  `validator`, `annotate`, `annotator`, `compile`, and `bundle` take
  `NoInfer<SchemaSource<S>>`, so `S` comes from the config, not the
  schema. A URI isn't checked. `SchemaTypeOf<C>` gets a config's `S`, for a
  registry. Rejected: a type argument on each call
  (`validate<V1Schema>(…)`), which leaves the simple path unchecked.
- **`jsonSchemaConfig` is a generic function.** It infers `S` from its
  argument, and the config's other media types (`M`) from its `mediaTypes`.
  Rejected: a class, declared as an interface and a constructor type with a
  generic construct signature, plus one without type parameters for
  subclasses, because a class can't infer its type parameter as a type
  computed from its constructor's argument. `S` isn't in any member's
  parameters, so a `JsonSchemaConfig<V1Schema>` is assignable to a
  `JsonSchemaConfig`, whose `S` is `any`.
- **What it took in TypeScript 6.** The dialects' type parameter is
  `const`, so a dialect written in the options keeps `unknownKeywords` and
  its keywords' shapes as literals. Its constraint uses
  `Keyword<any, Shape, any>`, because `Keyword<any, any, any>` gives
  `shape` no contextual type. It has no default: with one, TypeScript
  picks the default instead of inferring when a dialect in the options has
  a function with untyped parameters. And `NoInfer` wraps the whole
  `SchemaSource<S>`: `string | NoInfer<S>` rejected schemas that fit `S`.
- **A registry has the type of the schemas it takes.**
  `SchemaRegistry<S = ReadonlyJson>` checks what `with` and the constructor are
  given, and the registries `with` and `without` return keep `S`. `concat`
  returns a union of its registries' types. A union
  takes more than one dialect. The constructor's entries don't infer `S`
  (`NoInfer`), or a registry made from entries would only take schemas
  like them. Where a registry is given (the config and the option), it's
  `SchemaRegistry<any>`, because a
  `SchemaRegistry<V1Schema>` isn't a `SchemaRegistry<Json>`: neither schema
  type is assignable to the other.
- **A registry is typed where it's made.** `new SchemaRegistry<V1Schema>()`
  checks the schemas added to it. The config is given a registry that's
  already made, so the config's schema type can't check what's added to it.
  Rejected: checking it where it's used, which would need a registry's type
  to accumulate every schema added to it and would report a mismatch at the
  call instead of the schema; and a function that makes a typed empty
  registry (`registryFor(config)`), which does nothing at runtime and is a
  second way to make one.
- **What's only read is `ReadonlyJson`** (from `@hyperjump/browser`):
  a registry's schemas, the instance `validate` and `annotate` get, and
  `restore`'s compiled schema. So is what a format, a keyword's
  `InstanceOps.value`, and a plugin's `value()` get, because for a JS
  value that's the caller's instance. `Json` is assignable to it, so
  nothing that worked stops working. What's returned, like `serialize()`
  and `bundle()`, stays `Json`, because it's a new value the caller owns.
  The validator casts the instance to `Json` where it comes in, because
  evaluation only reads it.
- **Keyword definitions are annotated with their shapes**
  (`@type Keyword<number, "data">`), so their types can be checked against
  the dialect's list. That's also how a custom keyword gets its type:
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
- In draft-04 through draft-07, `$ref` makes its siblings ignored, but the
  type still checks them.
- `"data"` types are only as precise as `V`. A keyword with no `lower` still
  needs one for its value type.
- JSDoc can't declare a recursive union, so `itemPattern.js` types its rules
  loosely. The precise type is in `v1/index.d.ts`.
- A dialect built from a meta-schema's `$vocabulary` has no type unless
  someone writes its keyword map.
- A keyword written inside the config, with a function whose parameters
  aren't typed, loses their contextual types while the dialects' type is
  inferred, so they're implicitly `any`. Declaring the keyword before the
  config, with `satisfies Keyword`, avoids it.
- A dialect declared as a variable needs `satisfies DialectConfig`, or
  `unknownKeywords` widens to `string` and doesn't fit.
