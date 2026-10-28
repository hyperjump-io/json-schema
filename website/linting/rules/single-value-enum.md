# `single-value-enum`

In `recommended`, as a warning.

`enum` with only one value, like `["foo"]`, which `const: "foo"` says
more directly. Draft-04 doesn't have `const`, so it isn't reported there.
The dialect's name for `const` is looked up, so custom dialects are
covered too. `enum` next to `const` isn't reported, because `const` can't
replace it. `keyword-implied-by-const-or-enum` or
`const-or-enum-value-rejected` reports it. It has no options.

## Examples

### Reported

#### One value

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["foo"]
}
```

> 'enum' has only one value. Use 'const' instead.

### Not reported

#### More than one value

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": ["foo", "bar"]
}
```

#### No values

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "enum": []
}
```
