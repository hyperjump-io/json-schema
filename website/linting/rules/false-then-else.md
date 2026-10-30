# `false-then-else`

In `recommended`, as a warning.

`then` or `else` that allows nothing when a simpler schema would say the
same thing, or when nothing is valid at all. A branch allows nothing if
it's `false` or if its keywords can't all pass for any value, like
`{ "type": "string", "const": 1 }`.

- `if` with a `then` that allows nothing and no `else`. A value is only
  valid if it fails `if`. That's the same as `not` with the `if` schema.
- `if` with an `else` that allows nothing and no `then`. A value is only
  valid if it passes `if`. That's the same as the `if` schema on its own.
- `then` and `else` both allow nothing. Nothing is valid, whatever `if`
  says.

When the other branch is present, the rewrite isn't as simple, so only the
case where both allow nothing is reported. Without `if`,
`then-else-without-if` reports them instead. It has no options.

## Examples

### Reported

#### Then false

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": { "required": ["a"] },
  "then": false
}
```

> 'if' with a 'then' that allows nothing is the same as 'not' with the 'if' schema

#### Else false

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": { "required": ["a"] },
  "else": false
}
```

> 'if' with an 'else' that allows nothing is the same as the 'if' schema on its own

#### Both false

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true,
  "else": false,
  "then": false
}
```

> 'then' and 'else' both allow nothing, so nothing is valid

### Not reported

#### False with the other branch

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true,
  "then": false,
  "else": { "type": "string" }
}
```

#### Without if

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "then": false
}
```
