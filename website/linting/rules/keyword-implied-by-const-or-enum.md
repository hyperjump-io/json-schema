# `keyword-implied-by-const-or-enum`

In `recommended`, as a warning.

A keyword next to `const` or `enum` that allows the `const` value or
every value in `enum`, like `minLength: 3` next to `enum: ["one", "two"]`,
so it has no effect. Only those values can be valid, and it allows all of
them.

Each keyword is evaluated on the values from what it lowers to
(`evaluatorForLint`), including keywords that apply schemas, like `allOf`
and `properties`. One that annotates a value has an effect, like an
`allOf` with a `title`, so `format` is never reported. So does one that
marks a property or an item as evaluated, if `unevaluatedProperties` or
`unevaluatedItems` might read it. A keyword with no effect at all, like
`minLength: 0`, is reported too. `type` is left to
`type-implied-by-const-or-enum`, so that rule can be turned off on its
own. In a schema with both `const` and `enum`, `enum` is a keyword next
to `const`. A keyword that rejects a value is reported by
`const-or-enum-value-rejected`, and one that might isn't reported.

It has no options.

## Examples

### Reported

#### An assertion every enum value passes

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["one", "two"],
  "minLength": 3
}
```

> 'minLength' has no effect, because it allows every value in 'enum'

#### The const value passes

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "const": 5,
  "maximum": 10,
  "multipleOf": 5
}
```

> 'maximum' has no effect, because it allows the 'const' value
>
> 'multipleOf' has no effect, because it allows the 'const' value

#### An assertion for another type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": [1, 2],
  "pattern": "^a"
}
```

> 'pattern' has no effect, because it allows every value in 'enum'

### Not reported

#### An assertion a value fails

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["one", "three"],
  "maxLength": 3
}
```

#### draft-04 limits with their exclusive siblings

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "enum": [4, 5],
  "maximum": 5,
  "exclusiveMaximum": true
}
```
