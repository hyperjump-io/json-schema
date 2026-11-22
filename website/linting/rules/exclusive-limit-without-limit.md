# `exclusive-limit-without-limit`

In `openapi-3-0`, as a warning.

`exclusiveMaximum` without `maximum`, or `exclusiveMinimum` without
`minimum`, in OpenAPI 3.0. In 3.0, they're booleans that make the limit
next to them exclusive. Without that limit, they have no effect, and the
limit might be missing by mistake. 3.0's JSON Schema draft allows it, so
it's a warning.

Draft-04 requires the limit, so there it's a problem with the schema,
which this rule doesn't report. It's only for OpenAPI 3.0, and it has no
options.

## Examples

### Reported

#### Without maximum

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "number",
  "exclusiveMaximum": true
}
```

> 'exclusiveMaximum' has no effect without 'maximum'

#### The other limit doesn't count

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "number",
  "minimum": 0,
  "exclusiveMaximum": true
}
```

> 'exclusiveMaximum' has no effect without 'maximum'

### Not reported

#### With the limit

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "number",
  "maximum": 1,
  "exclusiveMaximum": true
}
```
