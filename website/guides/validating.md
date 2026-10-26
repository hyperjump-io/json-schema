# Validating

Compile a schema once with `compile`, then validate as many values as you
like with the `Validator` it returns. A validator doesn't change, and it
doesn't retrieve anything, so it's safe to share and reuse.

```javascript
const validator = await jsonSchema.compile("https://example.com/person");

validator.validate({ name: "Jason" }); // true
```

## What to validate

A validator takes a value in one of three forms. Pick the one you have.

| You have | Validate | Annotate |
| --- | --- | --- |
| A JavaScript value | `validate(value)` | `annotate(value)` |
| JSON text | `validateJson(text)` | `annotateJson(text)` |
| A JSON AST node | `validateNode(node)` | `annotateNode(node)` |

`validate` and its variants say whether the value is valid and, if you ask,
why not. `annotate` and its variants also collect
[annotations](annotations.md).

### A JavaScript value

Use `validate` for data you already have as a value, like the result of
`JSON.parse` or an object your code built. It's the fastest.

### JSON text

Use `validateJson` for data that's still JSON text, such as a file or a
request body. Don't parse it first. With the text, every error has the line
and column of the value it's about, so you can point to it. Syntax errors
are reported along with validation errors. The parser recovers from them
where it can, so the rest of the text is still validated.

```javascript
const result = validator.validateJson(`{ "name": "Jason", "age": -1, }`, { output: "BASIC" });
```

`result.errors` has a validation error and a syntax error:

| `source` | `ruleId` | `place` |
| --- | --- | --- |
| `"json-schema"` | `"https://json-schema.org/keyword/minimum"` | 1:27 to 1:29, the `-1` |
| `"json"` | `"trailing-comma"` | 1:29 to 1:30, the `,` |

A `place` is a [unist position](https://github.com/syntax-tree/unist#position),
with the `line`, `column`, and `offset` of its `start` and `end`:

```javascript
result.errors[0].place.start; // { line: 1, column: 27, offset: 26 }
```

Any syntax error makes the value invalid, even one the parser could recover
from, like the trailing comma here.

A JSON string is also a valid value, so `validate` can't tell text from a
string. That's why they're separate methods.

### A JSON AST node

Use `validateNode` when you already have a parsed JSON AST, from the JSON
parser in `@hyperjump/browser/json` or from a schema AST, such as a lint rule
checking a `default` value. Errors have the node's positions.

```javascript
import { fromJson } from "@hyperjump/browser/json";

const { node } = fromJson(`{ "name": "Jason" }`);
validator.validateNode(node); // true
```

## Asking why

Every method takes an `output` option. The default, `"FLAG"`, is only a
boolean. `"BASIC"` and `"DETAILED"` return the errors.

```javascript
validator.validate({ age: -1 }, { output: "BASIC" });
// { valid: false, errors: [...] }
```

See [Output and errors](output.md) for what's in an error and how to report
it.

## Shortcuts

`jsonSchema.validate(uri, value)`, `validateJson`, `annotate`, and
`annotateJson` compile and validate in one call. They compile the schema
every time, so use them for one-off checks, not in a loop.

```javascript
await jsonSchema.validate("https://example.com/person", { name: "Jason" }); // true
```
