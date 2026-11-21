# `required-property-not-defined`

In `recommended`, as a warning.

A property in `required` that isn't defined in `properties` or
`patternProperties` by any schema that can apply to the same object. Any
value is allowed for it, and it's often a typo, like `"nmae"` for
`"name"`.

The schemas that can apply to the same object are the ones connected to
it, in either direction, by keywords that apply a schema in place, like
`allOf`, `anyOf`, and `if`. References connect schemas too, in either
direction, within the document. So `required` in an `anyOf` is defined by
`properties` next to the `anyOf`. A schema in `$defs` is defined by the
schemas that reference it.

References to another document are followed. But references from another
document to this one aren't known. So some groups of schemas aren't
reported: ones that define no properties and could be referenced from
elsewhere, like the root or a schema in `$defs`. They're probably meant to
be combined with a schema that does define properties.

`additionalProperties` and `unevaluatedProperties` define every property.
These aren't reported:

- A group with a reference that can't be followed, like `$dynamicRef` or a
  reference to a document that can't be retrieved
- `required` in a `not`, which requires a property to be missing

A required property that isn't allowed is reported by
`required-property-not-allowed`. It has no options.

## Examples

### Reported

#### Not in properties

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "name": true },
  "required": ["nmae"]
}
```

> 'nmae' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed

#### `patternProperties`, with the `u` flag

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "patternProperties": { "^\\p{L}$": {} },
  "required": ["é", "ab"]
}
```

> 'ab' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed

#### `required` in `anyOf` is defined by the schema the `anyOf` is in

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {} },
  "anyOf": [{ "required": ["a"] }, { "required": ["c"] }]
}
```

> 'c' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed

### Not reported

#### `additionalProperties` or `unevaluatedProperties` defines the rest

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {} },
  "additionalProperties": { "type": "string" },
  "required": ["b"]
}
```

#### `required` in `anyOf` is defined by the schema the `anyOf` is in

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {}, "b": {} },
  "anyOf": [{ "required": ["a"] }, { "required": ["b"] }]
}
```
