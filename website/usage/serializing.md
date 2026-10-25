# Serializing compiled schemas

A compiled schema is JSON, so it can be cached and restored without retrieving
or compiling anything. The same keywords must have been added.

```javascript
const compiled = validator.serialize();
const restored = jsonSchema.restoreValidator(compiled);
```
