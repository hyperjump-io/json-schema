# `duplicate-one-of-schemas`

In `recommended`, as a warning.

A schema in `oneOf` that's equal to one before it. A value that matches
it matches both, so it fails `oneOf`, which needs exactly one to match.
That's rarely what's meant.

Schemas are compared as JSON, as `enum` compares values. Schemas that
mean the same thing but are written differently, like `true` and `{}`,
aren't found. It has no options.

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

### Not reported

#### Different schemas

```json
{
  "$schema": "https://json-schema.org/v1",
  "oneOf": [true, {}, { "type": "string" }, { "type": ["string"] }]
}
```

#### A property named oneOf isn't a keyword

```json
{
  "$schema": "https://json-schema.org/v1",
  "properties": { "oneOf": {} }
}
```
