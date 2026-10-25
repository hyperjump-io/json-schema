# `empty-catch-all-schema`

In `recommended`, as a warning.

A keyword that applies a schema with no effect to every property or item
that others don't, like `additionalProperties: true`, `items: {}`, or
`unevaluatedProperties: true`. From what it lowers to, that's
`eachProperty` with an `except` or `unevaluated` selector, or `eachItem`,
applying a schema that counts as `true` (see `keyword-without-effect`).

It still marks what it applies to as evaluated, so removing it can change
what an `unevaluated*` allows. Writing it for that is a mistake, so it's
reported anyway. Turn the rule off for a schema that does.

## Examples

### Reported

#### additionalProperties: true

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": true
}
```

> 'additionalProperties' has a schema that allows everything, which is the same as leaving it out

#### Items and unevaluated keywords

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "prefixItems": [{ "type": "string" }],
  "items": true,
  "unevaluatedItems": {},
  "unevaluatedProperties": true
}
```

> 'items' has a schema that allows everything, which is the same as leaving it out
>
> 'unevaluatedItems' has a schema that allows everything, which is the same as leaving it out
>
> 'unevaluatedProperties' has a schema that allows everything, which is the same as leaving it out

#### Items and additionalItems in 2019-09

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "items": [{ "type": "string" }],
  "additionalItems": true
}
```

> 'additionalItems' has a schema that allows everything, which is the same as leaving it out

### Not reported

#### A schema with an effect

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": { "type": "string" }
}
```

#### A reference to a schema with no effect

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": { "$ref": "#/$defs/a" },
  "$defs": { "a": { "type": "string" } }
}
```
