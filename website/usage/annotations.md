# Annotations

`annotate` validates and returns the instance as a JSON AST
([unist](https://github.com/syntax-tree/unist)) with annotations attached to its
nodes. `annotateJson` does the same for JSON text. `annotateNode` attaches
annotations to a JSON AST node you pass it and returns only the output.
Annotations are a `Map` of keyword URI to the values collected for that node.

```javascript
const { output, node } = validator.annotate({ name: "Jason" });

node.data.annotations;
// Map { "https://json-schema.org/keyword/title" => ["Person"] }
```

Annotations follow the spec. They're only kept for the parts of the schema the
instance passed.
