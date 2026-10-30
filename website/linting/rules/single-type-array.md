# `single-type-array`

In `recommended`, as a warning.

`type` that's an array of one type, like `["string"]`. That's the same as
the type on its own, `"string"`. Turn the rule off if you write arrays
everywhere so that adding a type is a smaller change. It has no options.

## Examples

### Reported

#### An array of one type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["string"]
}
```

> 'type' has only one type, so it can be "string" instead of an array

#### In draft-04

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "type": ["integer"]
}
```

> 'type' has only one type, so it can be "integer" instead of an array

#### In a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "items": { "type": ["object"] }
}
```

> 'type' has only one type, so it can be "object" instead of an array

### Not reported

#### A single type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```

#### More than one type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["string", "null"]
}
```
