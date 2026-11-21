# `redundant-numeric-limit`

In `recommended`, as a warning.

`maximum` and `exclusiveMaximum`, or `minimum` and `exclusiveMinimum`, in
the same schema, where one never fails on its own because the other is
tighter. The looser one is reported. If they're equal, the exclusive one
is tighter.

Draft-04's `exclusiveMaximum` and `exclusiveMinimum` are booleans that
modify `maximum` and `minimum`, so they're never redundant. A lower limit
above an upper one is reported by `contradictory-limits`. It only looks at
one schema at a time. It has no options.

## Examples

### Reported

#### A `maximum` above `exclusiveMaximum`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "number",
  "exclusiveMaximum": 5,
  "maximum": 6
}
```

> 'maximum' has no effect, because 'exclusiveMaximum' is lower

#### An `exclusiveMaximum` above `maximum`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "maximum": 5,
  "exclusiveMaximum": 6
}
```

> 'exclusiveMaximum' has no effect, because 'maximum' is lower

#### Equal upper limits

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "maximum": 5,
  "exclusiveMaximum": 5
}
```

> 'maximum' has no effect, because 'exclusiveMaximum' excludes the same value

### Not reported

#### Only one of each

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "minimum": 0,
  "exclusiveMaximum": 10
}
```

#### draft-04's `exclusiveMaximum` changes `maximum`

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "maximum": 5,
  "exclusiveMaximum": true
}
```
