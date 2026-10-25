# `if-without-then-else`

In `recommended`, as a warning.

`if` without a sibling `then` or `else`. Whether it passes or fails, the
schema's result is the same, so the schema doesn't do what it seems to.
Its annotations are still collected when it passes, so in 2019-09 and
later it can make properties or items evaluated for
`unevaluatedProperties` and `unevaluatedItems`, but that's rarely meant.

It finds the keywords by URI, so it works in every dialect with `if`,
whatever they're named. It has no options.

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
