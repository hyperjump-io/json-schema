# `const-or-enum-value-for-disallowed-type`

In `recommended`, as a warning.

A `const` value or a value in `enum` whose type the sibling `type` doesn't
allow, so it's never valid. For `const`, that means nothing is valid. It's
often a value that's quoted when it shouldn't be, like `"1"` for an
integer, or `null` in an `enum` when `type` doesn't include `"null"`.
Types are decided as the `type` keyword decides them, so `1.0` is an
integer. Each value is reported.

It only looks at `type` in the same schema. It has no options.

## Examples

### Reported

#### An enum value type doesn't allow

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string",
  "enum": ["a", null]
}
```

> This value is null, which 'type' doesn't allow, so it's never valid

#### Each value is reported

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "enum": ["1", 2, "3"]
}
```

> This value is a string, which 'type' doesn't allow, so it's never valid
>
> This value is a string, which 'type' doesn't allow, so it's never valid

#### A number that isn't an integer

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "enum": [1, 1, 1.5]
}
```

> This value is a number that isn't an integer, which 'type' doesn't allow, so it's never valid

### Not reported

#### Every value is allowed

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["number", "null"],
  "enum": [1.5, null],
  "const": 2
}
```

#### Without type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["a", null]
}
```
