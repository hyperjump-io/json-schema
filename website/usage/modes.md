# Modes

A validator works in three modes, on three kinds of instance.

| | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| **Flag** | `validate(value)` | `validateJson(text)` | `validateNode(node)` |
| **Errors** | `validate(value, { output })` | `validateJson(text, { output })` | `validateNode(node, { output })` |
| **Annotations** | `annotate(value)` | `annotateJson(text)` | `annotateNode(node)` |

- **Flag** is just a boolean. It's the default, and the fastest.
- **Errors** says why an instance is invalid. Use the BASIC or DETAILED
  output format.
- **Annotations** validates and returns the instance as an AST with
  annotations on its nodes. It takes an `output` option too.
- **JSON text** is parsed error-tolerantly. Syntax errors are reported with
  validation errors, and every error has a position.
- **JSON AST** is a node you already have, such as a value in a schema AST.
