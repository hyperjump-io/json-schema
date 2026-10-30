# Validating

`validator` compiles a schema once and returns a function that can validate
as many values as you like. The function doesn't change and doesn't
retrieve anything, so it's safe to share and reuse.

```typescript
import { validator } from "@hyperjump/json-schema";

const isPerson = await validator(jsonSchema, "https://example.com/person");

isPerson({ name: "Jason" }); // true
```

| Function | Does |
| --- | --- |
| `validator(jsonSchema, schema, options)` | Compiles and returns a function that validates |
| `annotator(jsonSchema, schema, options)` | Compiles and returns a function that also collects [annotations](annotations.md) |
| `validate(jsonSchema, schema, value, options)` | Compiles and validates once |
| `annotate(jsonSchema, schema, value, options)` | Compiles and annotates once |

`validate` and `annotate` compile the schema every time. Use them for
one-off checks, not in a loop.

The first argument can also be a session. Then several calls share the
schemas it retrieved. See [Sessions](../extending/sessions.md).

## The schema

A schema can be its URI, like `"https://example.com/person"` or a `file:`
URL. It can also be the schema itself.

```typescript
await validate(jsonSchema, {
  $schema: "https://json-schema.org/v1",
  type: "string"
}, "Jason"); // true
```

A schema given as a value is only used for that call. It's identified by
its `$id`. If it doesn't have one, it gets a new `urn:uuid:` URI. That URI
is what its errors' `absoluteKeywordLocation` uses, and relative references
in the schema are resolved against it.

It can reference schemas in a [registry](loading-schemas.md#registries).
But its `$id` can't be one that a registry also has, even if the schemas
are identical. A boolean schema has no `$schema`, so it needs the
`defaultDialectUri` config.

Nothing is cached. Calling `validate(jsonSchema, schema, value)` with the
same schema value compiles it again each time. Call `validator` once
instead.

## What to validate

A validator takes a value in one of three forms. Choose the form with the
`input` option. Pick the one that matches what you have.

| You have | `input` | The instance's type |
| --- | --- | --- |
| A JavaScript value | `"value"` (the default) | `ReadonlyJson` |
| JSON text | `"json"` | `string` |
| A JSON AST node | `"node"` | `JsonNode` |

A JSON string is also a valid value, so a validator can't tell JSON text
from a string. That's why the form is an option. The function a validator
returns accepts the type that matches its `input`.

### A JavaScript value

This is the default. Use it for data you already have as a value, like the
result of `JSON.parse` or an object your code built. It's the fastest.

### JSON text

Use this for data that's still JSON text, such as a file or a request body.
Don't parse it first. With the text, every error has the line and column of
the value it's about, so you can point to it. Syntax errors are reported
along with validation errors. The parser recovers from them where it can,
so the rest of the text is still validated.

```typescript
import { BASIC, validator } from "@hyperjump/json-schema";

const checkText = await validator(jsonSchema, "https://example.com/person", { input: "json", output: BASIC });
const result = checkText(`{ "name": "Jason", "age": -1, }`);
```

`result.errors` has a validation error and a syntax error. They're in the
order they appear in the text:

| Error | Source | Rule ID | Position |
| --- | --- | --- | --- |
| -1 is less than the minimum | json-schema | `https://json-schema.org/keyword/minimum` | 1:27-1:29 |
| A trailing comma | json | trailing-comma | 1:29-1:30 |

The position is the error's `place`. A `place` is a
[unist position](https://github.com/syntax-tree/unist#position). It has the
`line`, `column`, and `offset` of its `start` and `end`:

```typescript
result.errors[0].place.start; // { line: 1, column: 27, offset: 26 }
```

Any syntax error makes the value invalid. That includes errors the parser
could recover from, like the trailing comma here.

### A JSON AST node

Use this for a parsed JSON AST you already have. It might come from the JSON
parser in `@hyperjump/browser/json` or from a schema AST. For example, a
lint rule might check a `default` value this way. Errors have the node's
positions.

```typescript
import { fromJson } from "@hyperjump/browser/json";

const isPersonNode = await validator(jsonSchema, "https://example.com/person", { input: "node" });

const { node } = fromJson(`{ "name": "Jason" }`);
isPersonNode(node); // true
```

## Asking why

The `output` option sets the output format. The default, `FLAG`, is just a
boolean. `BASIC` and `DETAILED` return the errors.

```typescript
import { BASIC, validator } from "@hyperjump/json-schema";

const checkPerson = await validator(jsonSchema, "https://example.com/person", { output: BASIC });
checkPerson({ age: -1 });
// { valid: false, errors: [...] }
```

See [Output and errors](output.md) for what's in an error and how to report
one.

## Keeping a compiled schema

`compile` returns the compiled schema itself, which is a `CompiledSchema`.
`validatorFor` and `annotatorFor` make functions from a compiled schema.
They take the same options as `validator` and `annotator`, so you can use
one compiled schema to validate in different ways. `serialize` and
`restore` keep a compiled schema between runs. See [Caching](caching.md).

```typescript
import { BASIC, compile, validatorFor } from "@hyperjump/json-schema";

const person = await compile(jsonSchema, "https://example.com/person");
const isPerson = validatorFor(person);
const checkPerson = validatorFor(person, { output: BASIC });
```
