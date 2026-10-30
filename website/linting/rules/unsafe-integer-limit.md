# `unsafe-integer-limit`

In `recommended`, as a warning.

`maximum`, `minimum`, `exclusiveMaximum`, or `exclusiveMinimum` beyond
±9,007,199,254,740,991 (2⁵³ - 1) when `type` allows integers but not other
numbers. Implementations that use IEEE 754 doubles for numbers can't
represent every integer beyond that. That includes JavaScript
implementations like this one. They might compare values to the limit
inexactly.

Limits like int64's maximum can be deliberate for implementations that
use 64-bit integers. Turn the rule off if yours are. It only looks at
`type` in the same schema. It has no options.

## Examples

### Reported

#### Limits beyond the safe range

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "maximum": 90071992547409980,
  "minimum": -90071992547409980
}
```

> 'maximum' is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly
>
> 'minimum' is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly

#### Limits at the edge of the safe range

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "exclusiveMaximum": 9007199254740992
}
```

> 'exclusiveMaximum' is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly

#### In a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "items": { "type": "integer", "maximum": 9223372036854776000 }
}
```

> 'maximum' is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly

### Not reported

#### Limits at the edge of the safe range

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "maximum": 9007199254740991,
  "minimum": -9007199254740991
}
```

#### A type that allows other numbers

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "maximum": 1e+300
}
```
