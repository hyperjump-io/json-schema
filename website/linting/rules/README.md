# Rules

Each rule's page says why what it reports matters, its options, and
examples of what it reports and what it doesn't.

## In `recommended`

| Rule | Reports |
| --- | --- |
| [`then-else-without-if`](then-else-without-if.md) | `then` or `else` without `if` |
| [`if-without-then-else`](if-without-then-else.md) | `if` without `then` or `else` |
| [`empty-then-else`](empty-then-else.md) | `then` or `else` that every value is valid against, like `{}`, so it has no effect |
| [`false-then-else`](false-then-else.md) | `then` or `else` that's `false`, where `not` or the `if` schema says the same thing, or both `false`, so nothing is valid |
| [`duplicate-enum-values`](duplicate-enum-values.md) | A value in `enum` that's equal to one before it |
| [`empty-enum`](empty-enum.md) | An `enum` with no values, which nothing is valid against |
| [`empty-type`](empty-type.md) | A `type` that's an empty array, which nothing is valid against |
| [`duplicate-one-of-schemas`](duplicate-one-of-schemas.md) | A schema in `oneOf` that's equal to one before it, so a value it matches always fails |
| [`duplicate-all-of-any-of-schemas`](duplicate-all-of-any-of-schemas.md) | A schema in `allOf` or `anyOf` that's equal to one before it, so it has no effect |
| [`contradictory-limits`](contradictory-limits.md) | A lower limit above its upper limit, like `minimum` above `maximum` or `minLength` above `maxLength`, or more required properties than `maxProperties` allows |
| [`impossible-property`](impossible-property.md) | A property no valid object can have, because an object with it needs more properties than `maxProperties` allows, like a `dependentRequired` that depends on it |
| [`redundant-numeric-limit`](redundant-numeric-limit.md) | `maximum` and `exclusiveMaximum`, or `minimum` and `exclusiveMinimum`, where the looser one has no effect |
| [`single-value-range`](single-value-range.md) | `minimum` and `maximum` with the same value where `type` only allows numbers, which `const` says more directly |
| [`fractional-limit-for-integer`](fractional-limit-for-integer.md) | A numeric limit that isn't an integer, where `type` only allows integers, so it's the same as an integer limit |
| [`unsafe-integer-limit`](unsafe-integer-limit.md) | A limit beyond ±2⁵³ - 1 where `type` only allows integers, which implementations that use doubles may compare inexactly |
| [`multiple-of-one`](multiple-of-one.md) | `multipleOf: 1` where `type` allows numbers, which `type: "integer"` says more clearly, or where `type` only allows integers, so it has no effect |
| [`single-type-array`](single-type-array.md) | `type` that's an array of one type, like `["string"]`, instead of the type on its own |
| [`additional-items-without-items-array`](additional-items-without-items-array.md) | `additionalItems` without an `items` that's an array of schemas (draft-04 through 2019-09) |
| [`ignored-ref-siblings`](ignored-ref-siblings.md) | A property next to `$ref` in draft-04 through draft-07, where `$ref` replaces the whole schema |
| [`misnamed-definitions`](misnamed-definitions.md) | `definitions` in 2019-09 and later, or `$defs` in draft-04 through draft-07, where it isn't a keyword, so what's in it isn't a schema |
| [`const-and-enum`](const-and-enum.md) | `const` and `enum` in the same schema, where `enum` either has no effect or nothing is valid |
| [`single-value-enum`](single-value-enum.md) | `enum` with only one value, which `const` says more directly (draft-06 and later) |
| [`content-schema-without-media-type`](content-schema-without-media-type.md) | `contentSchema` without `contentMediaType` |
| [`invalid-default-or-example`](invalid-default-or-example.md) | A `default` value or a value in `examples` that isn't valid against the schema it's in, or against a schema that applies it, like one with `allOf` |
| [`dependency-on-required-property`](dependency-on-required-property.md) | A dependency in `dependentRequired`, `dependentSchemas`, or `dependencies` on a property that's in `required`, so it always applies |
| [`required-dependent-property`](required-dependent-property.md) | A property a dependency in `dependentRequired` or `dependencies` requires that `required` already requires, so requiring it there has no effect |
| [`keyword-for-disallowed-type`](keyword-for-disallowed-type.md) | A keyword or known format for one type of value, like `minimum`, `properties`, or the `date` format, in a schema whose `type` doesn't allow that type |
| [`min-properties-covered-by-required`](min-properties-covered-by-required.md) | `minProperties` that's no more than the number of properties in `required`, so it has no effect |
| [`type-implied-by-const-or-enum`](type-implied-by-const-or-enum.md) | `type` that allows the `const` value or every value in `enum`, so it has no effect. Turn it off if your tools need `type` |
| [`const-or-enum-value-for-disallowed-type`](const-or-enum-value-for-disallowed-type.md) | A `const` value or a value in `enum` that `type` doesn't allow, so it's never valid |
| [`keyword-implied-by-const-or-enum`](keyword-implied-by-const-or-enum.md) | A keyword next to `const` or `enum`, like `minLength` or `allOf`, that allows every value, so it has no effect |
| [`const-or-enum-value-rejected`](const-or-enum-value-rejected.md) | A `const` value or a value in `enum` that a keyword next to it, like `multipleOf` or `properties`, rejects, so it's never valid |
| [`required-property-not-allowed`](required-property-not-allowed.md) | A property in `required` that `properties`, `patternProperties`, or `additionalProperties` doesn't allow, so no object is valid |
| [`required-property-not-defined`](required-property-not-defined.md) | A property in `required` that no schema applying to the same object defines in `properties` or `patternProperties`, including schemas it's combined with by `allOf`, `anyOf`, `$ref`, and so on |
| [`keyword-without-type`](keyword-without-type.md) | A keyword or known format for one type of value, like `properties`, `minimum`, or the `date` format, where no `type`, `const`, or `enum` says what type the value is, so values of other types are valid |
| [`property-names-type`](property-names-type.md) | `type` in a `propertyNames` schema, which has no effect if it allows strings, because property names are always strings, and otherwise rejects every property name |
| [`read-only-and-write-only`](read-only-and-write-only.md) | `readOnly` and `writeOnly` both `true` in the same schema |
| [`min-max-contains-without-contains`](min-max-contains-without-contains.md) | `minContains` or `maxContains` without `contains` |
| [`min-contains-zero-without-max-contains`](min-contains-zero-without-max-contains.md) | `minContains: 0` next to `contains` without `maxContains`, so `contains` never fails |
| [`keyword-without-effect`](keyword-without-effect.md) | A keyword that's the same as leaving it out, like `properties: {}`, `minLength: 0`, `uniqueItems: false`, or `minContains: 1`, or that only marks properties or items nothing reads |
| [`empty-catch-all-schema`](empty-catch-all-schema.md) | A keyword that applies a schema that allows everything to every property or item others don't, like `additionalProperties: true` or `items: {}` |
| [`unknown-keyword`](unknown-keyword.md) | A property of a schema that isn't a keyword in its dialect, usually a misspelling, with a suggestion when a keyword is close. The `ignore` option lists names not to report |
| [`non-canonical-dialect-uri`](non-canonical-dialect-uri.md) | A `$schema` with a fragment that isn't empty, that isn't normalized, or that doesn't match its official dialect's URI, like draft-07 without `#`, which other implementations may not recognize |
| [`invalid-dialect-uri`](invalid-dialect-uri.md) | A v1 `$schema` with a fragment or that isn't normalized, which v1 doesn't allow (an error) |
| [`relative-root-id`](relative-root-id.md) | A relative `$id` on the root schema, like `/user`, so the schema's identifier depends on where it was retrieved from |
| [`implicit-dialect`](implicit-dialect.md) | A root schema without `$schema` whose dialect came from a media type parameter or the default dialect, so other tools may not know it |
| [`reference-without-target`](reference-without-target.md) | A `$ref` that doesn't find a schema, such as a file that doesn't exist or a JSON Pointer that doesn't point to anything |

A rule with options takes them after the severity, like
`["hjlint/rules/unknown-keyword", ["warn", { "ignore": ["x-internal"] }]]`.

## Not in a preset

These rules aren't in the recommended preset, because they're matters of
style.
Turn them on with a severity, like `["hjlint/rules/mergeable-all-of-schema", ["warn"]]`.

| Rule | Reports |
| --- | --- |
| [`mergeable-all-of-schema`](mergeable-all-of-schema.md) | A schema in `allOf` whose keywords can be moved into the schema `allOf` is in without changing what's valid |
