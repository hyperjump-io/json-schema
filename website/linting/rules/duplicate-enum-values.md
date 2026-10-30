# `duplicate-enum-values`

In `recommended`, as a warning.

A value in `enum` that's equal to one before it. It has no effect, and it
might be a typo for a value that's missing. Values are compared the way
JSON Schema compares them. Objects are compared without regard to property
order, and `1` and `1.0` are equal. Each duplicate is reported.

The specs say values should be unique. Draft-04 says they must be, so in
draft-04 it's a problem with the schema, which this rule doesn't report.
It has no options.

## Examples

### Reported

#### A duplicate string

```json
{ "$schema": "https://json-schema.org/v1", "enum": ["a", "b", "a"] }
```

> This value is already in 'enum'

#### Every duplicate is reported

```json
{ "$schema": "https://json-schema.org/v1", "enum": [1, 1, 1] }
```

> This value is already in 'enum'
>
> This value is already in 'enum'

### Not reported

#### Values that aren't equal

```json
{
  "$schema": "https://json-schema.org/v1",
  "enum": [
            1,
            "1",
            true,
            null,
            [1],
            [1, 1],
            { "a": 1 },
            { "a": "1" },
            {},
            []
          ]
}
```

#### Duplicates are a schema problem in draft-04, not lint

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "enum": ["a", "a"]
}
```
