# `min-properties-covered-by-required`

In `recommended`, as a warning.

`minProperties` that's no more than the number of properties the schema's
other keywords already require. An object that passes them already has
that many, so `minProperties` never fails on its own. It's likely out of
date, or meant to count properties beyond the required ones, which it
doesn't. More required properties than `maxProperties` allows is reported
by `contradictory-limits`.

Each required property is counted once. What's required includes
`required` in an `allOf` or in a schema a `$ref` applies, the fewest an
`anyOf` or `oneOf` branch requires, and v1's `requireAllExcept`. A
dependency, like `dependentRequired`, only requires its properties of
some objects, so they aren't counted. It has no options.

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

#### Required in an allOf

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "minProperties": 1,
  "allOf": [{ "required": ["a"] }]
}
```

> 'minProperties' has no effect, because 'allOf' already requires 1 property

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
