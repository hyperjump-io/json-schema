# `keyword-for-disallowed-type`

In `recommended`, as a warning.

A keyword that only applies to one type of value, in a schema whose `type`
doesn't allow that type. For example, `minimum` only applies to numbers
and `properties` only applies to objects. Any value the keyword would apply
to is invalid anyway, so the keyword never does anything. It's probably a
typo in `type` or a keyword in the wrong schema. `integer` allows the
keywords for numbers.

A `format` is reported if its definition says which types it applies to
with `types`. Every format JSON Schema defines does. Some formats could
apply to any type, so they aren't reported. That includes a format the
dialect doesn't support, one whose definition isn't in the config, and one
whose definition doesn't say.

It only looks at `type` in the same schema. It doesn't look at other
schemas that apply to the same value, like one in an `allOf`. It has no
options.

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
