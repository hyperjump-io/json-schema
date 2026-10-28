# `required-dependent-property`

In `recommended`, as a warning.

A property that a dependency in `dependentRequired`, or `dependencies` in
draft-04 through draft-07, requires, but that's already required, like
`b` in `"required": ["b"]` and `"dependentRequired": { "a": ["b"] }`. It's
always required, so the dependency doesn't add anything for it.

A property is required if every object that passes the schema's other
keywords has it, so `required` in an `allOf`, or in a schema a `$ref`
applies, counts too. A dependency on a property that's required is
reported by `dependency-on-required-property` instead. It has no options.

## Examples

### Reported

#### A dependent property that's required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["b"],
  "dependentRequired": { "a": ["b", "c"] }
}
```

> 'b' is already required, so requiring it here has no effect

### Not reported

#### Dependent properties that aren't required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["c"],
  "dependentRequired": { "a": ["b"] }
}
```

#### Without required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "dependentRequired": { "a": ["b"] }
}
```
