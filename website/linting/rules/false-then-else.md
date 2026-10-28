# `false-then-else`

In `recommended`, as a warning.

`then` or `else` that allows nothing, where a simpler schema says the
same thing, or where nothing is valid. It allows nothing if it's `false`,
or its keywords can't all pass a value of any type, like
`{ "type": "string", "const": 1 }`.

- `if` with a `then` that allows nothing and no `else`: a value is valid
  only if it fails `if`, which is `not` with the `if` schema.
- `if` with an `else` that allows nothing and no `then`: a value is valid
  only if it passes `if`, which is the `if` schema on its own.
- `then` and `else` both allow nothing: nothing is valid, whatever `if`
  says.

With the other branch too, the rewrite isn't as simple, so only both
allowing nothing is reported. Without `if`, `then-else-without-if` reports
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
