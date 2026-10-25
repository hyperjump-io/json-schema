# `dependency-on-required-property`

In `recommended`, as a warning.

A dependency on a property that's in the sibling `required`, in
`dependentRequired`, `dependentSchemas`, or `dependencies` (draft-04
through draft-07). A dependency applies when the property is present, and
a required property is always present, so the dependency always applies.
Its properties belong in `required`, or its schema in `allOf`. It may
also mean the property wasn't meant to be required.

It only looks at one schema at a time, not at `required` in another
schema that applies to the same value, such as one in an `allOf`. It
doesn't report a dependent property that's already required, which has
no effect either. It has no options.

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
