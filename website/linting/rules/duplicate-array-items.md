# `duplicate-array-items`

In `recommended`, as an error.

An item that's equal to one before it, in an array the specs say must be
unique: `required`, `type`, `dependentRequired`, the arrays in
`dependencies`, v1's `requireAllExcept`, and `enum` in draft-04. It has no
effect, and it might be a typo for an item that's missing. This
implementation accepts it, but other implementations might not, so it's
an error in the recommended preset.

Values are compared the way JSON Schema compares them, and each duplicate
is reported. Draft-06 and later say `enum`'s values should be unique,
which [`duplicate-enum-values`](duplicate-enum-values.md) reports. It has
no options.

## Examples

### Reported

#### A duplicate in required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["a", "b", "a"]
}
```

> 'a' is already in 'required'

#### A duplicate in a dependency

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "dependentRequired": { "a": ["b", "b"], "c": ["b"] }
}
```

> 'b' is already in 'dependentRequired' for 'a'

#### Draft-04's enum

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "enum": [1, 1.0]
}
```

> This value is already in 'enum'

### Not reported

#### Items that aren't equal

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["a", "A", "b"],
  "type": ["string", "number"]
}
```

#### Enum after draft-04 is duplicate-enum-values'

```json
{ "$schema": "http://json-schema.org/draft-07/schema#", "enum": [1, 1] }
```
