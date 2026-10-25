# `impossible-property`

In `recommended`, as a warning.

A property that no valid object can have, because an object with it
needs more properties than `maxProperties` allows, though objects without
it are valid. It's usually a dependency, like `dependentRequired` with
`"a": ["b", "c"]` and `maxProperties: 2`, or a property in `properties`
when the required properties already use up `maxProperties`.

The properties it checks are the ones a keyword in the schema applies a
schema to or makes something depend on. What an object needs counts
everything `contradictory-limits` counts: required properties,
dependencies, and schemas that apply to the same object. If no object is
valid at all, `contradictory-limits` reports it instead. The message is on
`maxProperties` and on the property's entry in each keyword that names
it. It has no options.

## Examples

### Reported

#### A dependency that needs too many properties

```json
{
  "$schema": "https://json-schema.org/v1",
  "dependentRequired": { "a": ["b", "c"] },
  "maxProperties": 2
}
```

> An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'
>
> An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'

#### Each keyword that names the property

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "properties": { "a": {} },
  "dependencies": { "a": ["b", "c"] },
  "maxProperties": 2
}
```

> An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'
>
> An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'
>
> An object with 'a' needs 3 properties, but 'maxProperties' allows at most 2, so no valid object has 'a'

#### Alternatives

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "dependentSchemas": {
                        "a": {
                               "anyOf": [
                                          { "required": ["b"] },
                                          { "required": ["c"] }
                                        ]
                             }
                      },
  "maxProperties": 1
}
```

> An object with 'a' needs at least 2 properties, but 'maxProperties' allows at most 1, so no valid object has 'a'
>
> An object with 'a' needs at least 2 properties, but 'maxProperties' allows at most 1, so no valid object has 'a'

### Not reported

#### A dependency that fits

```json
{
  "$schema": "https://json-schema.org/v1",
  "dependentRequired": { "a": ["b"] },
  "maxProperties": 2
}
```

#### A required property isn't reported here

```json
{
  "$schema": "https://json-schema.org/v1",
  "required": ["a"],
  "dependentRequired": { "a": ["b"] },
  "maxProperties": 2
}
```
