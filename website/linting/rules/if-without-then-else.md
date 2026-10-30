# `if-without-then-else`

In `recommended`, as a warning.

`if` without a sibling `then` or `else`. Whether `if` passes or fails, the
schema's result is the same, so the schema doesn't do what it seems to.
Its annotations are still collected when it passes. In 2019-09 and later,
that means it can mark properties or items as evaluated for
`unevaluatedProperties` and `unevaluatedItems`. That's rarely intended.

It finds the keywords by URI, so it works in every dialect that has `if`,
whatever the keywords are named. It has no options.

## Examples

### Reported

#### If without then or else

```json
{ "$schema": "https://json-schema.org/v1", "if": { "minLength": 1 } }
```

> 'if' without 'then' or 'else' only collects annotations

### Not reported

#### If with then

```json
{ "$schema": "https://json-schema.org/v1", "if": true, "then": true }
```

#### If with else

```json
{ "$schema": "https://json-schema.org/v1", "if": true, "else": true }
```
