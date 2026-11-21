# `deprecated-example`

In `openapi-3-1`, as a warning. In `openapi-3-2`, as a warning.

OpenAPI's `example` keyword. OpenAPI 3.1 deprecated it in favor of JSON
Schema's `examples`, and says later versions may remove it. `examples` is
an array, so `"example": "Misty"` becomes `"examples": ["Misty"]`. If the
schema already has `examples`, add the value to it.

OpenAPI 3.0 doesn't have `examples`, and its `example` isn't deprecated,
so it isn't reported there. It has no options.

## Examples

### Reported

#### Example

```json
{
  "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  "type": "string",
  "example": "Misty"
}
```

> 'example' is deprecated. Use 'examples', which is an array of examples, instead.

#### Next to examples

```json
{
  "$schema": "https://spec.openapis.org/oas/3.1/dialect/2024-11-10",
  "type": "string",
  "example": "Misty",
  "examples": ["Tom"]
}
```

> 'example' is deprecated. Add its value to 'examples' instead.

### Not reported

#### Examples

```json
{
  "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  "type": "string",
  "examples": ["Misty"]
}
```

#### In OpenAPI 3.0

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "string",
  "example": "Misty"
}
```
