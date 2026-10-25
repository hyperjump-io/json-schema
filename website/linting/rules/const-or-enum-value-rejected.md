# `const-or-enum-value-rejected`

In `recommended`, as a warning.

A value in `enum` that a keyword next to it rejects, like `5` in
`enum: [10, 5]` next to `multipleOf: 2`, so it's never valid, or a `const`
value that one rejects, so nothing is valid. Each value is reported once,
with every keyword that rejects it.

It checks the same keywords as `keyword-implied-by-const-or-enum`,
including ones that apply schemas, like `properties` and `anyOf`. A value
a keyword might reject isn't reported, like one a reference that can't be
followed decides. A value that `type` doesn't allow is reported by
`const-or-enum-value-for-disallowed-type`.

It has no options.

## Examples

### Reported

#### An enum value an assertion rejects

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": [10, 5],
  "multipleOf": 2
}
```

> 'multipleOf' rejects this value, so it's never valid

#### A const value

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "const": "a",
  "minLength": 2
}
```

> 'minLength' rejects the 'const' value, so nothing is valid

#### More than one assertion

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["a"],
  "minLength": 2,
  "maxLength": 0,
  "pattern": "^b"
}
```

> 'minLength', 'maxLength' and 'pattern' reject this value, so it's never valid

### Not reported

#### Values every assertion allows

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["one", "two"],
  "minLength": 3
}
```

#### Type isn't checked

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": [1],
  "type": "string"
}
```
