# `false-then-else`

In `recommended`, as a warning.

`then` or `else` that's `false`, where a simpler schema says the same
thing, or where nothing is valid.

- `if` with `then: false` and no `else`: a value is valid only if it fails
  `if`, which is `not` with the `if` schema.
- `if` with `else: false` and no `then`: a value is valid only if it
  passes `if`, which is the `if` schema on its own.
- `then` and `else` both `false`: nothing is valid, whatever `if` says.

With the other branch too, the rewrite isn't as simple, so only both
being `false` is reported. Without `if`, `then-else-without-if` reports
them instead. It has no options.

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

> 'if' with a false 'then' is the same as 'not' with the 'if' schema

#### Else false

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": { "required": ["a"] },
  "else": false
}
```

> 'if' with a false 'else' is the same as the 'if' schema on its own

#### Both false

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true,
  "else": false,
  "then": false
}
```

> 'then' and 'else' are both false, so nothing is valid

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
