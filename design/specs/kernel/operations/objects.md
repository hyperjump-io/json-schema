# Objects

| Operation | Applies to | Passes when | Marks |
| --- | --- | --- | --- |
| `{ op: "propertyCount", min?: number, max?: number }` | object | the number of properties is within the limits | – |
| `{ op: "hasProperty", name: string }` | object | it has the property | – |
| `{ op: "propertyEquals", name: string, value: Json }` | object | it has the property and its value equals `value` | – |
| `{ op: "property", name: string, of: Expression }` | object | it doesn't have the property, or its value passes | the name, if it passes |
| `{ op: "eachProperty", select: Selector, of: Expression }` | object | every selected property's value passes | each name it passes |
| `{ op: "eachPropertyName", of: Expression }` | object | every property name passes, as a string | – |

`Selector` is:

- `{ pattern: string }`: names the ECMA-262 pattern (`u` flag) matches
- `{ except: { names: string[]; patterns: string[] } }`: names that aren't
  listed and don't match any of the patterns
- `{ unevaluated: true }`: names not marked yet

- `property`, `eachProperty`, and `eachPropertyName` explain their
  failures. The first two evaluate property values, which are children.
  `eachPropertyName` evaluates names, which are children too.
- **`propertyEquals`** is separate from `property(name, equals(value))`
  because it doesn't mark the property. `propertyDependencies` uses it as a
  condition, and a condition that passes keeps its marks, so the other form
  would mark the property as evaluated, which `propertyDependencies`
  doesn't.
