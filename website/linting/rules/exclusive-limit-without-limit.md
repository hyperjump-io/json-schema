# `exclusive-limit-without-limit`

In `recommended`, as an error. In `openapi-3-0`, as a warning.

`exclusiveMaximum` without `maximum`, or `exclusiveMinimum` without
`minimum`, in draft-04 and OpenAPI 3.0. There, they're booleans that make
the limit next to them exclusive. Without that limit, they have no effect,
and the limit might be missing by mistake.

Draft-04 says the limit must be there. This implementation accepts it
anyway, but other implementations might not, so it's an error in the
recommended preset. 3.0's JSON Schema draft doesn't say so, so it's a
warning in `openapi-3-0`. It has no options.

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

#### Draft-04

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "number",
  "exclusiveMinimum": true
}
```

> 'exclusiveMinimum' has no effect without 'minimum'

### Not reported

#### With the limit

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "number",
  "maximum": 1,
  "exclusiveMaximum": true
}
```
