# Invalid schemas

Schemas are always validated before they're used. A schema that isn't valid
can't be used, so `compile` throws a `SchemaError`. Its `messages` are every
problem in the document, as plain objects with the document's `uri`, a
`message`, and a `place` if the schema was JSON text. `toVFileMessage`
converts one to a `VFileMessage`.

```javascript
jsonSchema.addRegistry(new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/bad",
  "minLength": -1
}`));

try {
  await jsonSchema.compile("https://example.com/bad");
} catch (error) {
  error.messages[0].message; // "Expected a non-negative integer"
  String(toVFileMessage(error.messages[0])); // "4:16-4:18: Expected a non-negative integer"
}
```
