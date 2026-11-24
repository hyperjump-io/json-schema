# `covered-one-of-schemas`

In `recommended`, as a warning.

A schema in `oneOf` that allows nothing another schema in it doesn't. A
value that matches it matches both. Then it fails `oneOf`, which needs
exactly one schema to match. So every value the schema allows is rejected.

Usually `anyOf` was meant, or the other schema was meant to leave those
values out.

Schemas are compared the way
[`redundant-all-of-any-of-schemas`](redundant-all-of-any-of-schemas.md)
compares them: by what they mean, as far as that's known without trying
values. So the rule doesn't find every schema like this, but the ones it
reports always fail.

Two schemas that allow the same values are both reported.
`duplicate-one-of-schemas` reports the later one too. A schema that allows
nothing, like `false`, isn't reported, because it has no values to fail.
It has no options.

## Examples

### Reported

#### `integer` next to `number`

Every integer matches both schemas, so it fails.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "type": "integer" }, { "type": "number" }]
}
```

> A value this schema matches always fails 'oneOf', because 'oneOf/1' matches it too

#### Known values next to their type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "type": "string" }, { "enum": ["small", "large"] }]
}
```

> A value this schema matches always fails 'oneOf', because 'oneOf/0' matches it too

#### A tighter limit

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "maximum": 3 }, { "maximum": 4 }]
}
```

> A value this schema matches always fails 'oneOf', because 'oneOf/1' matches it too

### Not reported

#### Schemas that each allow something the other doesn't

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "maximum": 3 }, { "minimum": 2 }]
}
```

#### A schema that allows nothing

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [false, { "type": "string" }]
}
```

#### `anyOf` isn't reported

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "maximum": 3 }, { "maximum": 4 }]
}
```
