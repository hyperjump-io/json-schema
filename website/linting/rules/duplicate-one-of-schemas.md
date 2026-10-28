# `duplicate-one-of-schemas`

In `recommended`, as a warning.

A schema in `oneOf` that's the same as one before it. A value that
matches it matches both, so it fails `oneOf`, which needs exactly one to
match. That's rarely what's meant.

Schemas are the same if they mean the same, even written differently:
`true` and `{}`, `"type": "string"` and `"type": ["string"]`, keywords
in a different order, and references to the same schema. Their
subschemas are compared the same way. Annotations have to be the same,
from the same keywords, so schemas that differ only in `title` aren't
the same. A schema in another document is the same only as a reference
to the same place. It has no options.

## Examples

### Reported

#### A duplicate schema

```json
{
  "$schema": "https://json-schema.org/v1",
  "oneOf": [
             { "type": "string" },
             { "type": "number" },
             { "type": "string" }
           ]
}
```

> This schema is already in 'oneOf', so a value it matches always fails 'oneOf'

#### The same schema, written differently

```json
{
  "$schema": "https://json-schema.org/v1",
  "oneOf": [{ "type": "string" }, { "type": ["string"] }]
}
```

> This schema is already in 'oneOf', so a value it matches always fails 'oneOf'

### Not reported

#### Different schemas

```json
{
  "$schema": "https://json-schema.org/v1",
  "oneOf": [true, false, { "type": "string" }, { "type": ["string", "null"] }]
}
```

#### A property named oneOf isn't a keyword

```json
{
  "$schema": "https://json-schema.org/v1",
  "properties": { "oneOf": {} }
}
```
