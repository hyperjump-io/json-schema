# `required-property-not-defined`

In `recommended`, as a warning.

A property in `required` that no schema that can apply to the same object
defines, in `properties` or `patternProperties`. Any value is allowed for
it, and it's often a typo, like `"nmae"` for `"name"`.

The schemas that can apply to the same object are the ones connected
through keywords that apply a schema in place, like `allOf`, `anyOf`, and
`if`, in either direction, and references, in either direction within
the document. So `required` in an `anyOf` is defined by `properties` next
to the `anyOf`, and a schema in `$defs` is defined by the schemas that
reference it. A reference to another document is followed, but what
references this one from another document isn't known. So a group of
schemas that defines no properties, and could be referenced from
elsewhere, like the root or one in `$defs`, isn't reported, because
it's likely meant to be combined with one that does.

`additionalProperties` and `unevaluatedProperties` define every property.
Nothing is reported for a group with a reference that can't be followed,
like `$dynamicRef` or one to a document that can't be retrieved, or for
`required` in a `not`, which requires a property to be missing. A required
property that isn't allowed is reported by `required-property-not-allowed`.
It has no options.

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

#### patternProperties, with the u flag

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "patternProperties": { "^\\p{L}$": {} },
  "required": ["é", "ab"]
}
```

> 'ab' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed

#### Required in anyOf is defined by the schema the anyOf is in

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {} },
  "anyOf": [{ "required": ["a"] }, { "required": ["c"] }]
}
```

> 'c' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed

### Not reported

#### additionalProperties or unevaluatedProperties defines the rest

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {} },
  "additionalProperties": { "type": "string" },
  "required": ["b"]
}
```

#### Required in anyOf is defined by the schema the anyOf is in

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {}, "b": {} },
  "anyOf": [{ "required": ["a"] }, { "required": ["b"] }]
}
```
