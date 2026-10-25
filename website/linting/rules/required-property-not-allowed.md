# `required-property-not-allowed`

In `recommended`, as a warning.

A property in `required` that the same schema doesn't allow, so no object
is valid. Its schema in `properties` or a matching `patternProperties`
is `false`, or it's in neither and `additionalProperties` is `false`.
It's often a typo in `required` or in `properties`.

It only looks at one schema at a time. `unevaluatedProperties: false`
isn't considered, because whether another schema evaluates the property
depends on the instance. It has no options.

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
