# `min-properties-covered-by-required`

In `recommended`, as a warning.

`minProperties` that's no more than the number of properties the sibling
`required` requires. An object with the required properties already has
that many, so `minProperties` never fails on its own. It's likely out of
date, or meant to count properties beyond the required ones, which it
doesn't. `required` with more properties than `maxProperties` allows is
reported by `contradictory-limits`.

Each property in `required` is counted once. It only looks at one schema
at a time, not at `required` in another schema that applies to the same
value, such as one in an `allOf`. It has no options.

## Examples

### Reported

#### minProperties equal to the number of required properties

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["a", "b"],
  "minProperties": 2
}
```

> 'minProperties' has no effect, because 'required' already requires 2 properties

#### One required property

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "minProperties": 1,
  "required": ["a"]
}
```

> 'minProperties' has no effect, because 'required' already requires 1 property

### Not reported

#### minProperties greater than the number of required properties

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "minProperties": 3,
  "required": ["a", "b"]
}
```

#### Without required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "minProperties": 1
}
```
