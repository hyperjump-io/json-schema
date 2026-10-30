# `keyword-for-disallowed-type`

In `recommended`, as a warning.

A keyword that applies only to one type of value, like `minimum` to
numbers or `properties` to objects, in a schema whose `type` doesn't allow
that type. Any value it would apply to is invalid anyway, so it never
does anything. It's likely a typo in `type` or a keyword in the wrong
schema. `integer` allows the keywords for numbers.

A `format` is reported if its definition says which types it applies to
(`types`), as every format JSON Schema defines does. A format the dialect
doesn't support, whose definition isn't in the config, or that doesn't say,
could apply to any type, so it isn't. It only
looks at `type` in the same schema, not in another schema that
applies to the same value, such as one in an `allOf`. It has no options.

## Examples

### Reported

#### A number keyword with a string type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "minimum": 1
}
```

> 'minimum' applies only to numbers, which 'type' doesn't allow

#### Each type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "boolean",
  "maxLength": 1,
  "items": true,
  "required": ["a"],
  "multipleOf": 2,
  "enum": [true]
}
```

> 'maxLength' applies only to strings, which 'type' doesn't allow
>
> 'items' applies only to arrays, which 'type' doesn't allow
>
> 'required' applies only to objects, which 'type' doesn't allow
>
> 'multipleOf' applies only to numbers, which 'type' doesn't allow

#### A type array that doesn't

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["string", "null"],
  "maxItems": 5
}
```

> 'maxItems' applies only to arrays, which 'type' doesn't allow

### Not reported

#### A type array that allows the keyword

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["integer", "string"],
  "exclusiveMaximum": 10,
  "maxLength": 5
}
```

#### Integer allows number keywords

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "minimum": 0,
  "multipleOf": 2
}
```
