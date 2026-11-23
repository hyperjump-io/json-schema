# `exclusive-limit-without-limit`

In `recommended`, as an error.

`exclusiveMaximum` without `maximum`, or `exclusiveMinimum` without
`minimum`, in draft-04 and OpenAPI 3.0. There, they're booleans that make
the limit next to them exclusive. Without that limit, they have no effect,
and the limit might be missing by mistake.

Draft-04 says the limit must be there. This implementation accepts it
anyway, but other implementations might not, so it's an error in the
recommended preset. 3.0's JSON Schema draft doesn't say so, so it's a
warning in [`@hyperjump/openapi`'s `openapi-3-0` preset](https://github.com/hyperjump-io/openapi/blob/main/website/linting/README.md). It
has no options.

## Examples

### Reported

#### Without maximum

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "number",
  "exclusiveMaximum": true
}
```

> 'exclusiveMaximum' has no effect without 'maximum'

#### The other limit doesn't count

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "number",
  "minimum": 0,
  "exclusiveMaximum": true
}
```

> 'exclusiveMaximum' has no effect without 'maximum'

#### Without minimum

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

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "number",
  "maximum": 1,
  "exclusiveMaximum": true
}
```
