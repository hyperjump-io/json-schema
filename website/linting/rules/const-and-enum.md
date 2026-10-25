# `const-and-enum`

In `recommended`, as a warning.

`const` and `enum` in the same schema. `const` allows only one value. If
that value is in `enum`, `enum` has no effect, and it's reported. If it
isn't, nothing is valid against the schema, and whichever comes second is
reported. Values are compared as JSON Schema does. The specs allow it, so
it's lint.

It only looks at one schema at a time, not at `const` and `enum` in
different schemas that apply to the same value, such as two in an
`allOf`. It has no options.

## Examples

### Reported

#### The const value is in enum

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": [5, 6],
  "const": 5
}
```

> 'enum' has no effect, because 'const' allows only one value, which is in it

#### The const value isn't in enum

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "const": 7,
  "enum": [5, 6]
}
```

> The 'const' value isn't in 'enum', so nothing is valid

### Not reported

#### Const alone

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "const": 5
}
```

#### draft-04 doesn't have const

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "const": 5,
  "enum": [6]
}
```
