# `required-dependent-property`

In `recommended`, as a warning.

A property that's already required but that a dependency also requires.
The dependency can be in `dependentRequired`, or in `dependencies` in
draft-04 through draft-07. For example, `b` in `"required": ["b"]` and
`"dependentRequired": { "a": ["b"] }`. `b` is always required, so the
dependency doesn't add anything for it.

A property is required if every object that passes the schema's other
keywords has it. That means `required` in an `allOf` or in a schema that a
`$ref` applies counts too. A dependency on a required property is reported
by `dependency-on-required-property` instead. It has no options.

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
