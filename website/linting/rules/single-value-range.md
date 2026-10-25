# `single-value-range`

In `recommended`, as a warning.

`minimum` and `maximum` with the same value, where `type` only allows
numbers, so that value is the only one that's valid. `const` says it more
directly, or a single-value `enum` in draft-04, which doesn't have
`const`. The schema's other keywords stay as they are, so replacing the
limits doesn't change what's valid.

Without `type`, or where `type` allows other types, values of those types
are valid too, which `const` wouldn't allow, so it isn't reported. With
an exclusive limit, nothing is valid, which `contradictory-limits`
reports. It has no options.

## Examples

### Reported

#### Equal limits

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "minimum": 5,
  "maximum": 5
}
```

> 'minimum' and 'maximum' are both 5, so it's the only valid value. Use 'const': 5 instead.

#### draft-04 uses enum

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": "number",
  "minimum": 5,
  "maximum": 5
}
```

> 'minimum' and 'maximum' are both 5, so it's the only valid value. Use 'enum': [5] instead.

### Not reported

#### Different limits

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "minimum": 5,
  "maximum": 6
}
```

#### An exclusive limit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "minimum": 5,
  "exclusiveMaximum": 5
}
```
