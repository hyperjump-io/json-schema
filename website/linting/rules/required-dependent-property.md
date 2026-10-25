# `required-dependent-property`

In `recommended`, as a warning.

A property that a dependency in `dependentRequired`, or `dependencies` in
draft-04 through draft-07, requires, but that `required` next to it
already requires, like `b` in `"required": ["b"]` and
`"dependentRequired": { "a": ["b"] }`. It's always required, so the
dependency doesn't add anything for it.

A dependency on a property that's in `required` is reported by
`dependency-on-required-property` instead. Only `required` in the same
schema is checked. It has no options.

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

> 'b' is in 'required', so requiring it here has no effect

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
