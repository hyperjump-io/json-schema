# `keyword-without-effect`

In `recommended`, as a warning.

A keyword that's the same as leaving it out, from what it lowers to. Its
group always passes and doesn't annotate or mark anything, following the
schemas it applies, so a schema with no effect counts as `true`. For
example, `properties: {}`, `required: []`, `minLength: 0`,
`uniqueItems: false`, `propertyNames: {}`, or `allOf: [{}]`. A sibling
that the keywords that read it lower the same without is reported too,
like `minContains: 1` or draft-04's `exclusiveMaximum: false`.

A keyword that only marks particular properties or items as evaluated,
like `properties: { "a": true }`, is reported only if nothing in its
schema group reads marks and the group isn't open. An `unevaluated*` in
another document can read the marks of a schema it references, which is
a good reason to write one. Any subschema could be referenced from
another document, but the rule assumes only the root and definitions are
(see `SchemaGroup`'s `open`).

A keyword that applies a schema with no effect to every property or item
others don't, like `additionalProperties: true`, is the same, and
`empty-catch-all-schema` reports it too. So does a rule about a
keyword without effect because of its siblings, like `contentSchema`
without `contentMediaType`. Unknown keywords are left to
`unknown-keyword`, so its `ignore` option works.

References are followed, into other documents too, so `$ref` to a schema
with no effect has no effect. One that can't be followed has an effect.

## Examples

### Reported

#### properties: {}

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {}
}
```

> 'properties' has no effect

#### Empty objects and arrays

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {},
  "patternProperties": {},
  "dependentRequired": {},
  "dependentSchemas": {},
  "required": [],
  "allOf": [{}]
}
```

> 'properties' has no effect
>
> 'patternProperties' has no effect
>
> 'dependentRequired' has no effect
>
> 'dependentSchemas' has no effect
>
> 'required' has no effect
>
> 'allOf' has no effect

#### Empty dependencies

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "dependencies": {}
}
```

> 'dependencies' has no effect

### Not reported

#### A sibling that's read is used

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": true },
  "additionalProperties": false
}
```

#### Marks something in the group reads

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
                  "foo": {
                           "allOf": [{ "properties": { "a": true } }],
                           "unevaluatedProperties": false
                         }
                }
}
```
