# Rules

Every rule is in the `recommended` preset, except OpenAPI's, which are in
its version's preset, like `openapi-3-0` (see
[Choosing rules](../choosing-rules.md)). Each rule's page explains why
what it reports matters and lists its options. It also has examples of
what it reports and what it doesn't.

| Rule | Reports |
| --- | --- |
| [`then-else-without-if`](then-else-without-if.md) | `then` or `else` without `if` |
| [`if-without-then-else`](if-without-then-else.md) | `if` without `then` or `else` |
| [`empty-then-else`](empty-then-else.md) | `then`, `else`, or another branch of a condition that every value is valid against, like `{}`. It has no effect. |
| [`false-then-else`](false-then-else.md) | `then` or `else` that allows nothing when `not` or the `if` schema would say the same thing. Also `then` and `else` that both allow nothing, so nothing is valid. |
| [`duplicate-enum-values`](duplicate-enum-values.md) | A value in `enum` that's equal to one before it |
| [`keyword-allows-nothing`](keyword-allows-nothing.md) | A keyword that nothing is valid against, like an empty `enum` or `type` or `allOf` with `false` |
| [`duplicate-one-of-schemas`](duplicate-one-of-schemas.md) | A schema in `oneOf` that's the same as one before it. A value it matches always fails. |
| [`duplicate-all-of-any-of-schemas`](duplicate-all-of-any-of-schemas.md) | A schema in `allOf` or `anyOf` that's the same as one before it. It has no effect. |
| [`contradictory-limits`](contradictory-limits.md) | A lower limit above its upper limit, like `minimum` above `maximum` or `minLength` above `maxLength`. Also more required properties than `maxProperties` allows. |
| [`impossible-property`](impossible-property.md) | A property no valid object can have, because an object with it needs more properties than `maxProperties` allows. For example, a property that a `dependentRequired` depends on. |
| [`redundant-numeric-limit`](redundant-numeric-limit.md) | `maximum` with `exclusiveMaximum`, or `minimum` with `exclusiveMinimum`, where the looser one has no effect |
| [`single-value-range`](single-value-range.md) | `minimum` and `maximum` with the same value when `type` only allows numbers. `const` says it more directly. |
| [`fractional-limit-for-integer`](fractional-limit-for-integer.md) | A numeric limit that isn't an integer when `type` only allows integers. It's the same as an integer limit. |
| [`unsafe-integer-limit`](unsafe-integer-limit.md) | A limit beyond ±2⁵³ - 1 when `type` only allows integers. Implementations that use doubles might compare it inexactly. |
| [`multiple-of-one`](multiple-of-one.md) | `multipleOf: 1` when `type` allows numbers, where `type: "integer"` says it more clearly. Also when `type` only allows integers, where it has no effect. |
| [`single-type-array`](single-type-array.md) | `type` that's an array of one type, like `["string"]`, instead of the type on its own |
| [`mergeable-schemas`](mergeable-schemas.md) | A schema in `allOf`, or alone in `anyOf` or `oneOf`, whose keywords can be moved into its parent without changing what's valid |
| [`additional-items-without-items-array`](additional-items-without-items-array.md) | `additionalItems` without an `items` that's an array of schemas (draft-04 through 2019-09) |
| [`array-without-items`](array-without-items.md) | `type: "array"` without `items` in OpenAPI 3.0, which requires it (`openapi-3-0`) |
| [`unknown-field`](unknown-field.md) | A field OpenAPI's Discriminator, External Documentation, or XML Object doesn't define, like a typo (OpenAPI presets) |
| [`deprecated-example`](deprecated-example.md) | OpenAPI's `example`, which 3.1 and later deprecate in favor of `examples` (OpenAPI 3.1 and 3.2 presets) |
| [`deprecated-xml-field`](deprecated-xml-field.md) | `attribute` or `wrapped` in OpenAPI 3.2's `xml`, which 3.2 deprecates for `nodeType` (OpenAPI 3.2 preset) |
| [`wrapped-without-array`](wrapped-without-array.md) | `wrapped: true` in OpenAPI's `xml` in a schema whose `type` isn't `array`. It has no effect. (OpenAPI presets) |
| [`discriminator-without-composition`](discriminator-without-composition.md) | `discriminator` without `oneOf`, `anyOf`, or `allOf`, in a schema that no `allOf` builds on (OpenAPI presets) |
| [`discriminator-mapping-without-target`](discriminator-mapping-without-target.md) | A `discriminator`'s `mapping` or `defaultMapping` that isn't a schema name or a URI reference to a schema (OpenAPI presets) |
| [`discriminator-property-optional`](discriminator-property-optional.md) | A `discriminator` whose property is optional. In OpenAPI 3.2, only without `defaultMapping`. (OpenAPI presets) |
| [`ignored-ref-siblings`](ignored-ref-siblings.md) | A property next to `$ref` in draft-04 through draft-07, where `$ref` replaces the whole schema |
| [`misnamed-definitions`](misnamed-definitions.md) | `definitions` in 2019-09 and later, or `$defs` in draft-04 through draft-07. It isn't a keyword there, so what's in it isn't a schema. |
| [`single-value-enum`](single-value-enum.md) | `enum` with only one value. `const` says it more directly (draft-06 and later). |
| [`content-schema-without-media-type`](content-schema-without-media-type.md) | `contentSchema` without `contentMediaType` |
| [`invalid-default-or-example`](invalid-default-or-example.md) | A `default` value or a value in `examples` that isn't valid against its schema, or against a schema that applies it, like one with `allOf` |
| [`dependency-on-required-property`](dependency-on-required-property.md) | A dependency in `dependentRequired`, `dependentSchemas`, or `dependencies` on a property that's already required, so it always applies. Also an `if` that only requires required properties. |
| [`required-dependent-property`](required-dependent-property.md) | A property that a dependency in `dependentRequired` or `dependencies` requires but that's already required. Requiring it there has no effect. |
| [`keyword-for-disallowed-type`](keyword-for-disallowed-type.md) | A keyword or known format for one type of value, like `minimum`, `properties`, or the `date` format, in a schema whose `type` doesn't allow that type |
| [`min-properties-covered-by-required`](min-properties-covered-by-required.md) | `minProperties` that's no more than the number of properties already required. It has no effect. |
| [`type-implied-by-const-or-enum`](type-implied-by-const-or-enum.md) | `type` that allows the `const` value or every value in `enum`. It has no effect. Turn it off if your tools need `type`. |
| [`const-or-enum-value-for-disallowed-type`](const-or-enum-value-for-disallowed-type.md) | A `const` value or a value in `enum` that `type` doesn't allow. It's never valid. |
| [`keyword-implied-by-const-or-enum`](keyword-implied-by-const-or-enum.md) | A keyword next to `const` or `enum` that allows every value, like `minLength` or `allOf`. It has no effect. |
| [`const-or-enum-value-rejected`](const-or-enum-value-rejected.md) | A `const` value or a value in `enum` that a keyword next to it rejects, like `multipleOf` or `properties`. It's never valid. |
| [`required-property-not-allowed`](required-property-not-allowed.md) | A required property that `properties`, `patternProperties`, or `additionalProperties` doesn't allow. No object is valid. |
| [`required-property-not-defined`](required-property-not-defined.md) | A property in `required` that isn't defined in `properties` or `patternProperties` by any schema that applies to the same object. That includes schemas combined with it by `allOf`, `anyOf`, `$ref`, and so on. |
| [`keyword-without-type`](keyword-without-type.md) | A keyword or known format for one type of value, like `properties`, `minimum`, or the `date` format, when no `type`, `const`, or `enum` says what type the value is. Values of other types are valid. |
| [`property-names-type`](property-names-type.md) | `type` in a `propertyNames` schema. Property names are always strings, so it either has no effect or rejects every property name. |
| [`read-only-and-write-only`](read-only-and-write-only.md) | `readOnly` and `writeOnly` both `true` in the same schema |
| [`min-max-contains-without-contains`](min-max-contains-without-contains.md) | `minContains` or `maxContains` without `contains` |
| [`min-contains-zero-without-max-contains`](min-contains-zero-without-max-contains.md) | `minContains: 0` next to `contains` without `maxContains`. `contains` never fails. |
| [`keyword-without-effect`](keyword-without-effect.md) | A keyword that's the same as leaving it out, like `properties: {}`, `minLength: 0`, `uniqueItems: false`, or `minContains: 1`. Also a keyword that only marks properties or items that nothing reads. |
| [`empty-catch-all-schema`](empty-catch-all-schema.md) | A keyword that applies an allow-everything schema to every property or item other keywords don't cover, like `additionalProperties: true` or `items: {}` |
| [`unevaluated-without-effect`](unevaluated-without-effect.md) | `unevaluatedProperties` or `unevaluatedItems` when other keywords evaluate every property or item, like `additionalProperties: false`. It has no effect. |
| [`unknown-keyword`](unknown-keyword.md) | A property of a schema that isn't a keyword in its dialect. It's usually a misspelling, and the message suggests a keyword when one is close. The `ignore` option lists names not to report. |
| [`non-canonical-dialect-uri`](non-canonical-dialect-uri.md) | A `$schema` that other implementations might not recognize. It has a non-empty fragment, isn't normalized, or doesn't match its dialect's official URI, like draft-07 without `#`. |
| [`invalid-dialect-uri`](invalid-dialect-uri.md) | A v1 `$schema` that has a fragment or isn't normalized. v1 doesn't allow either, so it's an error. |
| [`misplaced-dialect`](misplaced-dialect.md) | `$schema` where its dialect doesn't allow it: anywhere but a schema resource's root, or the document's root in draft-04 through draft-07 |
| [`relative-root-id`](relative-root-id.md) | A relative `$id` on the root schema, like `/user`. The schema's identifier then depends on where it was retrieved from. |
| [`implicit-dialect`](implicit-dialect.md) | A root schema without `$schema` whose dialect came from a media type parameter or the default dialect. Other tools might not know the dialect. |
| [`reference-by-location`](reference-by-location.md) | A `$ref` that finds a schema by its file or by a JSON Pointer into an embedded resource instead of by the schema's `$id` |
| [`reference-without-target`](reference-without-target.md) | A `$ref` that doesn't find a schema, such as a file that doesn't exist or a JSON Pointer that doesn't point to anything |

A rule with options takes them after the severity:

```json
["@hyperjump/json-schema/lint/rules/unknown-keyword", ["warn", { "ignore": ["x-internal"] }]]
```
