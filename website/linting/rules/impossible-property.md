# `impossible-property`

In `recommended`, as a warning.

A property that no valid object can have, even though objects without it
are valid. An object with the property needs more properties than
`maxProperties` allows. Usually it's a dependency, like `dependentRequired`
with `"a": ["b", "c"]` and `maxProperties: 2`. It can also be a property
in `properties` when the required properties already use up
`maxProperties`.

It checks the properties that a keyword in the schema applies a schema to
or makes something depend on. To work out what an object needs, it counts
everything `contradictory-limits` counts. That's required properties,
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
