# `multiple-of-one`

In `recommended`, as a warning.

`multipleOf: 1` where `type` allows numbers. It only allows integers, which
`type` says more clearly: `"type": "number", "multipleOf": 1` is
`"type": "integer"`. Where `type` already only allows integers, it has no
effect.

Without `type`, values that aren't numbers are valid, so it isn't
reported. Draft-04 says an integer is a number without a fraction or
exponent part, so an implementation that follows it strictly rejects
`1.0` as an integer, while `multipleOf: 1` allows it. It only looks at
`type` in the same schema. It has no options.

## Examples

### Reported

#### With type number

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "multipleOf": 1
}
```

> 'multipleOf': 1 only allows integers. Remove it, and replace 'number' with 'integer' in 'type'.

#### With type integer

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "multipleOf": 1
}
```

> 'multipleOf': 1 has no effect, because 'type' only allows integers

#### With number and integer

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["number", "integer"],
  "multipleOf": 1
}
```

> 'multipleOf': 1 only allows integers. Remove it, and 'number' from 'type', which also allows 'integer'.

### Not reported

#### Without type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "multipleOf": 1
}
```

#### With a type that doesn't allow numbers

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "multipleOf": 1
}
```
