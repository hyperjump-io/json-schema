# `keyword-without-effect`

In `recommended`, as a warning.

A keyword that's the same as leaving it out, based on what it lowers to.
Its group always passes and doesn't annotate or mark anything. The rule
follows the schemas the keyword applies, and a schema with no effect
counts as `true`. Examples are `properties: {}`, `required: []`,
`minLength: 0`, `uniqueItems: false`, `propertyNames: {}`, and
`allOf: [{}]`.

It also reports a sibling that doesn't change how the keywords that read it
lower. Examples are `minContains: 1` and draft-04's
`exclusiveMaximum: false`.

Some keywords only mark particular properties or items as evaluated, like
`properties: { "a": true }`. Those are only reported if nothing in the
schema group reads the marks and the group isn't open. An `unevaluated*`
keyword in another document can read the marks of a schema it references,
which is a good reason to write one. Any subschema could be referenced
from another document, but the rule assumes only the root and definitions
are. See `SchemaGroup`'s `open`.

A keyword that applies a schema with no effect to every property or item
other keywords don't cover, like `additionalProperties: true`, is also a
keyword without effect. `empty-catch-all-schema` reports it too. Some
other rules report a keyword that has no effect because of its siblings,
like `contentSchema` without `contentMediaType`. Unknown keywords are left
to `unknown-keyword` so that its `ignore` option works.

References are followed, including into other documents. A `$ref` to a
schema with no effect has no effect. A reference that can't be followed
is treated as having an effect.

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
