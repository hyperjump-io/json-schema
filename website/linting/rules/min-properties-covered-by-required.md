# `min-properties-covered-by-required`

In `recommended`, as a warning.

`minProperties` that's no more than the number of properties the schema's
other keywords already require. An object that passes those keywords
already has that many properties, so `minProperties` never fails on its
own. It's probably out of date. Or it was meant to count properties beyond
the required ones, which it doesn't. If more properties are required than
`maxProperties` allows, `contradictory-limits` reports it.

Each required property is counted once. Required properties include:

- `required` in an `allOf` or in a schema that a `$ref` applies
- The fewest properties any `anyOf` or `oneOf` branch requires
- v1's `requireAllExcept`

A dependency like `dependentRequired` only requires its properties for
some objects, so those aren't counted. It has no options.

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
