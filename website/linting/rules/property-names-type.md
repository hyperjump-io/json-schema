# `property-names-type`

In `recommended`, as a warning.

`type` in a `propertyNames` schema. Property names are always strings. A
`type` that allows strings, like `"string"`, has no effect. A `type` that
doesn't, like `"integer"`, rejects every property name, so only objects
without properties are valid. A name that looks like a number, like `"1"`,
is still a string.

Only `type` in the `propertyNames` schema itself is checked. It doesn't
check a schema it references or combines with `allOf`, because those might
also apply to other values. It has no options.

## Examples

### Reported

#### Type string

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "propertyNames": { "type": "string", "pattern": "^a" }
}
```

> 'type' has no effect in 'propertyNames', because property names are always strings

#### A type without string

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "propertyNames": { "type": "integer" }
}
```

> 'type' doesn't allow strings, so no property name is valid, and only objects without properties are

### Not reported

#### Without type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "propertyNames": { "pattern": "^a" }
}
```

#### A boolean schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "propertyNames": false
}
```
