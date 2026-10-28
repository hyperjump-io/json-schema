# `duplicate-all-of-any-of-schemas`

In `recommended`, as a warning.

A schema in `allOf` or `anyOf` that's the same as one before it. A value
passes it exactly when it passes the first one, so it never changes the
result. It may be a copy that was meant to be changed. A duplicate in
`oneOf` makes the values it matches fail, which `duplicate-one-of-schemas`
reports.

Schemas are the same if they mean the same, even written differently:
`true` and `{}`, `"const": 1` and `"enum": [1]`, keywords in a different
order, and references to the same schema. Their subschemas are compared
the same way. Annotations have to be the same, from the same keywords,
so schemas that differ only in `title` aren't the same. A schema in
another document is the same only as a reference to the same place. It
has no options.

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

#### The same schema, written differently

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [true, {}]
}
```

> This schema is already in 'allOf', so it has no effect

### Not reported

#### Annotations from different keywords

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "title": "a" }, { "description": "a" }]
}
```

#### oneOf isn't reported

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [true, true]
}
```
