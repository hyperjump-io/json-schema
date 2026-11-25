# `exclusive-one-of-schemas`

Not in a preset.

A `oneOf` whose schemas can't match the same value, like schemas with
different types. At most one of them can match, so `anyOf` means the same
thing.

`anyOf` asks for less. An implementation can stop at the first schema that
matches. With `oneOf`, it has to try the rest to make sure no other schema
matches.

This is a matter of style, so it isn't in `recommended`. `oneOf` says the
schemas are alternatives, which some people prefer, and some tools treat
it differently from `anyOf`. Add the rule to your configuration to use it
(see [Choosing rules](../choosing-rules.md)).

Schemas are compared by what they mean, as far as that's known without
trying values:

- Types
- `const` and `enum` values
- Limits, like `maximum` and `minLength`, when the schemas have a `type`
- The schemas for a required property
- `not`
- References to schemas in the same document

So the rule doesn't find every `oneOf` like this, but the schemas in the
ones it reports can't match the same value. It isn't reported in a dialect
without `anyOf`. It has no options.

## Examples

### Reported

#### Different types

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "type": "string" }, { "type": "number" }]
}
```

> No value matches more than one schema in 'oneOf', so 'anyOf' means the same

#### A required property with different values

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "required": ["kind"],
      "properties": { "kind": { "const": "circle" } }
    },
    {
      "type": "object",
      "required": ["kind"],
      "properties": { "kind": { "const": "square" } }
    }
  ]
}
```

> No value matches more than one schema in 'oneOf', so 'anyOf' means the same

#### Limits that don't overlap

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    { "type": "number", "maximum": 3 },
    { "type": "number", "minimum": 5 }
  ]
}
```

> No value matches more than one schema in 'oneOf', so 'anyOf' means the same

### Not reported

#### Schemas that can match the same value

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "required": ["a"] }, { "required": ["b"] }]
}
```

#### Limits without a type

A string matches both schemas, because limits on numbers ignore it.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "maximum": 3 }, { "minimum": 5 }]
}
```

#### A property that isn't required

An object without `kind` matches both schemas.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    { "type": "object", "properties": { "kind": { "const": "circle" } } },
    { "type": "object", "properties": { "kind": { "const": "square" } } }
  ]
}
```
