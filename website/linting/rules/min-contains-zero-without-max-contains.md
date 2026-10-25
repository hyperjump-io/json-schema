# `min-contains-zero-without-max-contains`

In `recommended`, as a warning.

`minContains: 0` next to `contains`, without `maxContains`. Any number of
items can match `contains`, including none, so it never fails. The specs
say 0 is only useful with `maxContains`. `contains` still marks the items
that match as evaluated, for `unevaluatedItems`, which may be the point,
but that's rarely what's meant.

Without `contains`, `min-max-contains-without-contains` reports it
instead. It has no options.

## Examples

### Reported

#### minContains 0 without maxContains

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "contains": { "type": "number" },
  "minContains": 0
}
```

> 'minContains' is 0 and there's no 'maxContains', so 'contains' never fails

### Not reported

#### With maxContains

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "contains": true,
  "minContains": 0,
  "maxContains": 10
}
```

#### minContains above 0

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "contains": true,
  "minContains": 1
}
```
