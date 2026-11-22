# `nullable-without-type`

In `openapi-3-0`, as a warning.

`nullable` without `type` in the same schema, in OpenAPI 3.0. `nullable`
adds `null` to the types that `type` allows, and 3.0 says that's "only if
`type` is explicitly defined within the same Schema Object." Without
`type`, every value is valid already, including `null`, so `nullable` has
no effect.

A `type` in another schema, like one in an `allOf`, doesn't count. It's
only for OpenAPI 3.0, and it has no options.

## Examples

### Reported

#### Without type

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "nullable": true,
  "minLength": 1
}
```

> 'nullable' has no effect without 'type'

#### Type in another schema doesn't count

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "nullable": true,
  "allOf": [{ "type": "string" }]
}
```

> 'nullable' has no effect without 'type'

### Not reported

#### With type

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "string",
  "nullable": true
}
```
