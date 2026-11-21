# `array-without-items`

In `openapi-3-0`, as an error.

`type: "array"` without `items` in the same schema, in OpenAPI 3.0. The
3.0 spec requires `items` whenever `type` is `"array"`. Without it,
every item is valid, as in JSON Schema, so the schema still works. That's
why it's a lint rule rather than an invalid schema. Add `items`, even if
it's `{}`, to say what the items are.

An `items` in another schema, like one in an `allOf`, doesn't count. The
spec's requirement is about the schema that has the `type`. It's only for
OpenAPI 3.0, and it has no options.

## Examples

### Reported

#### Without items

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "array"
}
```

> 'type' is 'array' without 'items', which OpenAPI 3.0 requires

#### Items in another schema

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "array",
  "allOf": [{ "items": { "type": "string" } }]
}
```

> 'type' is 'array' without 'items', which OpenAPI 3.0 requires

### Not reported

#### With items

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "array",
  "items": { "type": "string" }
}
```

#### In JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "array"
}
```
