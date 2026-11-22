# `empty-array`

In `recommended`, as an error.

An empty array where the specs say it can't be empty: `allOf`, `anyOf`,
`oneOf`, `prefixItems`, v1's `type` and `conditional`, and draft-04's
`required`, `enum`, and the arrays in `dependencies`. Each one still has
an obvious meaning, so this implementation accepts it. An empty `allOf`,
`prefixItems`, `required`, or dependency has no effect, and an empty
`anyOf`, `oneOf`, `type`, or `enum` allows nothing. Other implementations
might not accept it, so it's an error in the recommended preset.

Where an empty array is allowed, like `enum` after draft-04,
[`keyword-allows-nothing`](keyword-allows-nothing.md) and
[`keyword-without-effect`](keyword-without-effect.md) report what it does
instead. It has no options.

## Examples

### Reported

#### An empty array

```json
{ "$schema": "https://json-schema.org/draft/2020-12/schema", "allOf": [] }
```

> 'allOf' can't be empty

#### Draft-04's required, enum, and dependencies

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "required": [],
  "enum": [],
  "dependencies": { "a": [], "b": ["c"] }
}
```

> 'required' can't be empty
>
> 'enum' can't be empty
>
> 'dependencies' for 'a' can't be empty

### Not reported

#### Arrays that can be empty

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "required": [],
  "dependencies": { "a": [] }
}
```
