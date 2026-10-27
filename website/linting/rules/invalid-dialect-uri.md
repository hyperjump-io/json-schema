# `invalid-dialect-uri`

In `recommended`, as an error.

A v1 `$schema` with a fragment, even an empty one, or that isn't
normalized, like `HTTPS://json-schema.org/v1#`. v1 doesn't allow either.
This implementation recovers, but other implementations may not
recognize the dialect, so it's an error in the recommended preset.
`non-canonical-dialect-uri` reports these too, and in other dialects, as
warnings.
It has no options.

## Examples

### Reported

#### v1 with an empty fragment

```json
{ "$schema": "https://json-schema.org/v1#", "type": "string" }
```

> '$schema' can't have a fragment in v1, not even an empty one. Use 'https://json-schema.org/v1'.

#### v1 that isn't normalized

```json
{ "$schema": "HTTPS://json-schema.org/%76%31", "type": "string" }
```

> '$schema' must be normalized in v1. Use 'https://json-schema.org/v1'.

### Not reported

#### v1

```json
{ "$schema": "https://json-schema.org/v1", "type": "string" }
```

#### A property named $schema

```json
{
  "$schema": "https://json-schema.org/v1",
  "properties": {
                  "$schema": { "const": "https://json-schema.org/v1#" }
                }
}
```
