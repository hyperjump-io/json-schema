# `empty-type`

In `recommended`, as a warning.

A `type` that's an empty array. No value has one of its types, so the
schema fails every instance. That's what `false` is for, so an empty
`type` is more likely types that are missing.

Draft-04 through 2020-12 allow it, though their meta-schemas don't, and
where they disagree, the spec is followed. v1 doesn't allow it, so there
it's a problem with the schema, which this rule doesn't report. It has
no options.

## Examples

### Reported

#### An empty type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": []
}
```

> 'type' is empty, so nothing is valid against it

### Not reported

#### A type with types

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": ["string"]
}
```

#### A type that's a string

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```
