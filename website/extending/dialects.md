# Custom dialects

Use `addDialect` for a dialect whose meta-schema doesn't define it. A dialect
maps keyword names to keyword URIs and says what unknown keywords mean.

```javascript
jsonSchema.addDialect({
  uri: "https://example.com/dialect",
  keywords: {
    type: "https://json-schema.org/keyword/type",
    even: "https://example.com/keyword/even"
  },
  unknownKeywords: "error"
});
```
