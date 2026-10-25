# JSON text

`validateJson` parses JSON text and validates it. The parse is error-tolerant,
so syntax errors are reported along with validation errors, and every error has
a position.

```javascript
const result = validator.validateJson(`{ "name": "Jason", "age": -1, }`, { output: "BASIC" });
// {
//   valid: false,
//   errors: [
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/minimum",
//       absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//       instanceLocation: "/age",
//       place: { start: { line: 1, column: 27, offset: 26 }, end: { line: 1, column: 29, offset: 28 } }
//     },
//     {
//       source: "json",
//       ruleId: "trailing-comma",
//       place: { start: { line: 1, column: 29, offset: 28 }, end: { line: 1, column: 30, offset: 29 } }
//     }
//   ]
// }
```

`validateNode` validates a JSON AST node, such as a value in a schema AST.
