# `duplicate-all-of-any-of-schemas`

In `recommended`, as a warning.

A schema in `allOf` or `anyOf` that's equal to one before it. A value
passes it exactly when it passes the first one, so it never changes the
result. It may be a copy that was meant to be changed. A duplicate in
`oneOf` makes the values it matches fail, which `duplicate-one-of-schemas`
reports.

Schemas are compared as JSON, as `enum` compares values. Schemas that
mean the same thing but are written differently, like `true` and `{}`,
aren't found. It has no options.

## Examples

### Reported

#### A duplicate in allOf

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "type": "string" }, { "type": "string" }]
}
```

> This schema is already in 'allOf', so it has no effect

#### A duplicate in anyOf

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [
             { "type": "integer" },
             { "type": "integer" },
             { "type": "string" }
           ]
}
```

> This schema is already in 'anyOf', so it has no effect

### Not reported

#### Schemas are compared as JSON values

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [true, {}]
}
```

#### oneOf isn't reported

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [true, true]
}
```
