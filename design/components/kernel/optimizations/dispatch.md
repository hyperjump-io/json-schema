# `dispatch.js`

`any` and `one` evaluate only what can pass the
instance, by its type or by a tag, with plugins too, which get the
errors of what's evaluated ([Optimizer](../../../specs/kernel/optimizer.md)).

- By type: an `any` of schemas that only have a `type` (tsconfig's
  `anyOf` of `boolean` and `null`) is a `typeIs` with all their types. A
  `one` whose expressions can't pass the same type (662 of
  `package.json`'s 697 `oneOf`s) is a `typeSwitch` with a branch for each
  type, otherwise `fail`, so it doesn't evaluate every schema to find out
  none of the others passes. The types an expression can pass come
  from `typeIs`, `equals`, and `oneOfValues`, through `all`, `any`,
  `one`, and `apply`, and anything else, or a schema that applies itself,
  counts as every type, so a schema is only left out if it can't pass.
- By tag: among the expressions that can pass an object, by the value of
  a property (a discriminator, like `"type": { "const": "SEQ" }` in
  tree-sitter's grammar schema, GeoJSON, or CQL2), or by which property
  an object has, where they're closed and require different properties
  (how serde writes a Rust enum, like `{ "eq": … }` or `{ "gt": … }` in
  the apollo-router schemas). What an expression needs of an object
  (properties it requires, values a property can have, and the only
  names it allows) comes from `hasProperty`, `propertyEquals`,
  `property` of known values, and `eachProperty` of what can't pass,
  through `all`, `any`, `one`, and `apply`. The tag that leaves the
  fewest expressions in its largest case is the `object` branch of a
  `typeSwitch`, whose other branches are what can pass other types,
  dispatched by type. A value is a `propertySwitch`: for each value, the
  `any` or `one` of the expressions that can pass it, dispatched again,
  then for other values, without the property, and for a value that
  couldn't be parsed, which equals every value, the expression as it was,
  so its result and errors are the same as before. Letting it pass
  instead hid errors that don't depend on the tag, and could make an
  enclosing `oneOf` or `not` fail. Which property an object has is a
  `keySwitch`: for each property some of the expressions don't allow, the
  ones that do, then the ones that don't require any of them. A property
  only decides where it was parsed, because one that couldn't be parsed
  passes the `eachProperty` that doesn't allow it, so where the object
  has only those, it's the expression as it was. Partial tags count: a
  schema that doesn't constrain the tag is in every case that has it.
  When no tag leaves fewer than all of them in every case, it's the tag by
  value that leaves the fewest when an object has the property, where
  none of them requires it (ansible-lint's 45 platforms, each with a
  `const` `name` and no `required`), and without the property, the union
  as it was, not dispatched again. An object without it costs one more
  lookup ([Tags none of them require](../../../benchmarks/kernel-in-src/tags-none-require.md)). Of
  SchemaStore's 886 schemas that compile, about 790 `oneOf`s and `anyOf`s
  can be dispatched by a tag that can't be by type, in about 230 schemas,
  100 of them recursive.
- By value, only in `fast`: an `any` or `one` of expressions that only
  pass some scalars (`const`s and `enum`s, maybe with a `type`, and
  `null` and `boolean`, which are their values) is a `oneOfValues` of
  them, for `one` the values only one of them passes. With plugins, the
  error would be the `anyOf`'s instead of each constant's, so it's kept.
- Nullable switches, only in `fast`: an `any` of one `typeSwitch`, maybe
  through schemas whose only group with an effect is one, and expressions
  that only check the type, is a `typeSwitch` where those types `pass`,
  unless anything reads marks or the dynamic scope
  ([Unions of constants](../../../benchmarks/kernel-in-src/unions-of-constants.md)).
It takes about 4 ms on `package.json`.
