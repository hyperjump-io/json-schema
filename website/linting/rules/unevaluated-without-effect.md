# `unevaluated-without-effect`

In `recommended`, as a warning.

An `unevaluatedProperties` or `unevaluatedItems` that never sees a property
or item that isn't evaluated, because the other keywords in its schema
evaluate every one whenever they pass, like `additionalProperties: false`
next to `unevaluatedProperties: false`, or an `allOf` schema with `items`.
It always passes, so it has no effect.

From what they lower to, that's `eachProperty` with an `except` selector
whose names and patterns are marked too, `eachItem` from an index whose
items before it are marked, or another `unevaluated` selector. Only what's
marked whenever the schema passes counts: something every branch of an
`anyOf`, `oneOf`, or `if` marks does, and something only one of them marks
doesn't. One with a schema that allows everything, like
`unevaluatedProperties: true`, is reported by `empty-catch-all-schema`
too.

## Examples

### Reported

#### additionalProperties next to unevaluatedProperties

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "unevaluatedProperties": false
}
```

> 'unevaluatedProperties' has no effect, because other keywords evaluate every property

#### additionalProperties in allOf

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "additionalProperties": false }],
  "unevaluatedProperties": false
}
```

> 'unevaluatedProperties' has no effect, because other keywords evaluate every property

#### Every branch of anyOf

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "additionalProperties": false }, { "additionalProperties": { "type": "string" } }],
  "unevaluatedProperties": false
}
```

> 'unevaluatedProperties' has no effect, because other keywords evaluate every property

#### Items next to unevaluatedItems

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "prefixItems": [{ "type": "string" }],
  "items": { "type": "number" },
  "unevaluatedItems": false
}
```

> 'unevaluatedItems' has no effect, because other keywords evaluate every item

### Not reported

#### Only some branches

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "additionalProperties": false }, { "properties": { "a": true } }],
  "unevaluatedProperties": false
}
```

#### A property that's only marked in a parent's schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false,
  "allOf": [{ "unevaluatedProperties": false }]
}
```

#### Items without prefixItems for every index

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "prefixItems": [{ "type": "string" }],
  "unevaluatedItems": false
}
```
