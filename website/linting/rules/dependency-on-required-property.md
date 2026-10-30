# `dependency-on-required-property`

In `recommended`, as a warning.

A dependency on a property that's already required. It applies to
`dependentRequired`, `dependentSchemas`, and `dependencies` (draft-04
through draft-07). A dependency applies when its property is present. A
required property is always present, so the dependency always applies.
Its properties belong in `required`, or its schema belongs in `allOf`. It
might also mean the property wasn't meant to be required.

The same goes for an `if` whose schema only requires properties that are
already required. That `if` always passes.

A property is required if every object that passes the schema's other
keywords has it. That means `required` in an `allOf` or in a schema that a
`$ref` applies counts too. A dependent property that's already required
isn't reported here. `required-dependent-property` reports that. It has no
options.

## Examples

### Reported

#### dependentRequired

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["meta"],
  "dependentRequired": { "meta": ["data"] }
}
```

> 'meta' is required, so this dependency always applies

#### Required in an allOf

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "required": ["meta"] }],
  "dependentRequired": { "meta": ["data"] }
}
```

> 'meta' is required, so this dependency always applies

#### An if that only requires required properties

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["kind"],
  "if": { "required": ["kind"] },
  "then": { "required": ["data"] }
}
```

> 'kind' is required, so the 'if' schema always passes

### Not reported

#### Without required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "dependentRequired": { "meta": ["data"] }
}
```

#### A property named dependentRequired

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["meta"],
  "properties": {
                  "dependentRequired": {
                                         "properties": { "meta": true }
                                       }
                }
}
```
