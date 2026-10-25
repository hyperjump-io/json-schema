# `fractional-limit-for-integer`

In `recommended`, as a warning.

`maximum`, `minimum`, `exclusiveMaximum`, or `exclusiveMinimum` that isn't
an integer, where `type` allows integers but not other numbers. Only
integers are valid, so `maximum: 7.8` is the same as `maximum: 7`, and
`exclusiveMaximum: 7.8` is also the same as `maximum: 7`. It's misleading,
and may mean the author thought other numbers were allowed.

Draft-04's `maximum` and `minimum` aren't checked, because its boolean
`exclusiveMaximum` and `exclusiveMinimum` change them. It only looks at
`type` in the same schema. It has no options.

## Examples

### Reported

#### A fractional maximum

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "maximum": 7.8
}
```

> 'maximum' isn't an integer, but 'type' only allows integers, so it's the same as 7

#### A fractional minimum rounds up

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "minimum": 3.2
}
```

> 'minimum' isn't an integer, but 'type' only allows integers, so it's the same as 4

#### Fractional exclusive limits

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "exclusiveMaximum": 7.8,
  "exclusiveMinimum": 0.5
}
```

> 'exclusiveMaximum' isn't an integer, but 'type' only allows integers, so it's the same as 'maximum': 7
>
> 'exclusiveMinimum' isn't an integer, but 'type' only allows integers, so it's the same as 'minimum': 1

### Not reported

#### Integer limits

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "maximum": 7,
  "minimum": 1
}
```

#### A type that allows other numbers

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "maximum": 7.8
}
```
