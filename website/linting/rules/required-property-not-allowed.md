# `required-property-not-allowed`

In `recommended`, as a warning.

A required property that the schema doesn't allow, so no object is
valid. Either its schema in `properties` or a matching
`patternProperties` allows nothing, like `false` or
`{ "type": "string", "const": 1 }`. Or it's in neither and
`additionalProperties` allows nothing. It's often a typo in `required` or
in `properties`.

It also looks at the schemas that have to pass with the schema, like the
ones in `allOf` and the one `$ref` refers to. A property one of them
requires, or one of them doesn't allow, counts. The message names the
keyword that applies that schema, like `'b' is required in 'allOf'`.
Schemas in `anyOf`, `oneOf`, `not`, and `if`/`then`/`else` don't count,
because they don't always have to pass. It doesn't consider
`unevaluatedProperties: false`, because whether another schema evaluates
the property depends on the instance. It has no options.

## Examples

### Reported

#### additionalProperties false

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": true },
  "additionalProperties": false,
  "required": ["a", "b"]
}
```

> 'b' is required, but 'additionalProperties' doesn't allow it, so no object is valid

#### False in properties

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": false },
  "required": ["a"]
}
```

> 'a' is required, but 'properties' doesn't allow it, so no object is valid

#### False in a matching pattern

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": true },
  "patternProperties": { "^a$": false },
  "required": ["a"]
}
```

> 'a' is required, but 'patternProperties' doesn't allow it, so no object is valid

#### A schema that allows nothing

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "required": ["a"],
  "properties": { "a": { "type": "string", "const": 1 } }
}
```

> 'a' is required, but 'properties' doesn't allow it, so no object is valid

#### Required in a schema that has to pass

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": true },
  "additionalProperties": false,
  "$ref": "#/$defs/hasB",
  "$defs": {
    "hasB": { "required": ["b"] }
  }
}
```

> 'b' is required in '$ref', but 'additionalProperties' doesn't allow it, so no object is valid

### Not reported

#### A pattern allows it

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "patternProperties": { "^b": true },
  "additionalProperties": false,
  "required": ["b"]
}
```

#### Allowed

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {} },
  "additionalProperties": { "type": "string" },
  "required": ["a", "b"]
}
```
