# Custom formats

```javascript
jsonSchema.addFormat({
  uri: "https://example.com/format/hex",
  types: ["string"],
  validate: (value) => /^[0-9a-f]+$/i.test(value)
});

jsonSchema.extendDialect(v1DialectUri, {
  formats: { hex: "https://example.com/format/hex" }
});
```

`types` lists the types of value a format applies to. A value of any other
type is valid, and `validate` isn't called for it. Without `types`, a format
applies to every type. A format can't apply to only integers, because
`integer` isn't a type of JSON value. A format for integers applies to
numbers.
