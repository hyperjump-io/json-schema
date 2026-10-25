# `min-max-contains-without-contains`

In `recommended`, as a warning.

`minContains` or `maxContains` without a sibling `contains`. They count the
items that pass `contains`, so neither does anything on its own.

It finds the keywords by URI, so it works in every dialect with
`minContains`, whatever they're named. It has no options.

## Examples

### Reported

#### minContains without contains

```json
{ "$schema": "https://json-schema.org/v1", "minContains": 1 }
```

> 'minContains' has no effect without 'contains'

#### maxContains without contains

```json
{ "$schema": "https://json-schema.org/v1", "maxContains": 1 }
```

> 'maxContains' has no effect without 'contains'

### Not reported

#### minContains and maxContains with contains

```json
{
  "$schema": "https://json-schema.org/v1",
  "contains": true,
  "minContains": 1,
  "maxContains": 2
}
```

#### A dialect without minContains

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "minContains": 1
}
```
