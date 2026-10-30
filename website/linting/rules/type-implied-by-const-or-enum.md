# `type-implied-by-const-or-enum`

In `recommended`, as a warning.

`type` next to `const` or `enum` when it allows the `const` value or every
value in `enum`. Only those values are valid, and their types are already
known, so `type` never fails on its own. Removing it says the same thing
with less. Some tools, like code generators, read `type` rather than the
values. Turn this rule off if yours do.

If `type` doesn't allow a value, it does have an effect. Then
`const-or-enum-value-for-disallowed-type` reports the value instead. Next
to an empty `enum`, nothing is valid, so `type` has no effect.
`keyword-allows-nothing` reports the empty `enum`. It has no options.

## Examples

### Reported

#### Type with enum

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "enum": [1, 2, 3]
}
```

> 'type' has no effect, because it allows every value in 'enum'

#### Type with const

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "const": "ready"
}
```

> 'type' has no effect, because it allows the 'const' value

### Not reported

#### A value type doesn't allow

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "enum": ["a", null]
}
```

#### Without const or enum

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```
