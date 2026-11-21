# `duplicate-one-of-schemas`

In `recommended`, as a warning.

A schema in `oneOf` that's the same as one before it. A value that matches
it matches both. Then it fails `oneOf`, which needs exactly one schema to
match. That's rarely what's meant.

Schemas are the same if they mean the same thing, even if they're written
differently. For example:

- `true` and `{}`
- `"type": "string"` and `"type": ["string"]`
- The same keywords in a different order
- References to the same schema

Subschemas are compared the same way. Annotations have to match and come
from the same keywords, so schemas that differ only in `title` aren't the
same. A schema in another document only matches a reference to the same
place. It has no options.

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

#### A property named `oneOf` isn't a keyword

```json
{
  "$schema": "https://json-schema.org/v1",
  "properties": { "oneOf": {} }
}
```
