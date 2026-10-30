# `then-else-without-if`

In `recommended`, as a warning.

`then` or `else` without a sibling `if`. Neither does anything on its own,
so the schema doesn't do what it seems to.

It finds the keywords by URI, so it works in every dialect that has `if`,
whatever the keywords are named. It has no options.

## Examples

### Reported

#### Then without if

```json
{ "$schema": "https://json-schema.org/v1", "then": { "minLength": 1 } }
```

> 'then' has no effect without 'if'

#### Else without if

```json
{ "$schema": "https://json-schema.org/v1", "else": true }
```

> 'else' has no effect without 'if'

### Not reported

#### Then and else with if

```json
{
  "$schema": "https://json-schema.org/v1",
  "if": true,
  "then": true,
  "else": true
}
```

#### A property named then isn't a keyword

```json
{
  "$schema": "https://json-schema.org/v1",
  "properties": { "then": true }
}
```
