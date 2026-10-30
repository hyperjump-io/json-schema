# Output and errors

By default, validation only says whether a value is valid. To find out why
it isn't, pass an output format as the `output` option.

```typescript
import { BASIC, validator } from "@hyperjump/json-schema";

const checkPerson = await validator(jsonSchema, "https://example.com/person", { output: BASIC });
const result = checkPerson({ age: -1 });
```

| Output | Result | Use it for |
| --- | --- | --- |
| `FLAG` (the default) | `boolean` | Only whether it's valid. It's the fastest. |
| `BASIC` | `BasicOutput`: `{ valid, errors }`, with a flat list of errors | Reporting each problem |
| `DETAILED` | `DetailedOutput`: `{ valid, errors }`, with errors nested by schema structure | Explaining how a failure in a subschema made its parent fail |

The result's type follows the format, so `result.errors` is only there
when you ask for errors.

A format you don't import isn't in your bundle, so code that only uses
`FLAG` doesn't load what's needed to find errors.

Asking for errors doesn't slow down valid values. A value is checked the
fast way first, and its errors are only worked out if it's invalid.

## The examples

The examples on this page validate `{ "age": -1 }` against this schema,
which has two problems: `age` is below the `minimum`, and `name` is
missing.

```json
{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/person",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name"]
}
```

The results below show only each error's `absoluteKeywordLocation` and
`instanceLocation`. [What's in an error](#whats-in-an-error) has the rest.

## BASIC

A list of every keyword that failed, in document order.

```typescript
const result = await validate(jsonSchema, "https://example.com/person", { age: -1 }, { output: BASIC });
```

```json wrap
{
  "valid": false,
  "errors": [
    {
      "absoluteKeywordLocation": "https://example.com/person#/properties/age/minimum",
      "instanceLocation": "/age"
    },
    {
      "absoluteKeywordLocation": "https://example.com/person#/required",
      "instanceLocation": ""
    }
  ]
}
```

A keyword whose failure is explained by its subschemas, like `properties`
failing because `/age` failed `minimum`, doesn't get an error of its own.
The errors that explain it are enough.

## DETAILED

The same errors, nested under the keywords that applied them. Here,
`minimum` is under the `properties` that applied its schema to `/age`.

```typescript
const result = await validate(jsonSchema, "https://example.com/person", { age: -1 }, { output: DETAILED });
```

```json wrap
{
  "valid": false,
  "errors": [
    {
      "absoluteKeywordLocation": "https://example.com/person#/properties",
      "instanceLocation": "",
      "errors": [
        {
          "absoluteKeywordLocation": "https://example.com/person#/properties/age/minimum",
          "instanceLocation": "/age"
        }
      ]
    },
    {
      "absoluteKeywordLocation": "https://example.com/person#/required",
      "instanceLocation": ""
    }
  ]
}
```

## What's in an error

An error is an `OutputError`: a `ValidationError` from a keyword that
failed, or, for [JSON text](validating.md#json-text), a `JsonSyntaxError`.
Check `source` to tell them apart. A validation error is plain data:

| Property | What it is |
| --- | --- |
| `source` | `"json-schema"` |
| `ruleId` | The URI of the keyword that failed, like `https://json-schema.org/keyword/minimum`. It's the same in every dialect that has the keyword, so you can tell what failed without knowing which dialect the schema is in. |
| `absoluteKeywordLocation` | Where the keyword is: the schema's URI, with a JSON Pointer to the keyword. For a schema in a file, it's relative to the working directory, like `schemas/person.schema.json#/properties/age`, so it doesn't say where your files are. |
| `instanceLocation` | A JSON Pointer to the value that failed. `""` is the whole value. |
| `place` | The line and column of the value in the JSON text, if it was validated from text |
| `errors` | `DETAILED` only: the errors that made this keyword fail |

A syntax error has a `source` of `"json"`, a `ruleId` like
`"trailing-comma"`, and a `place`, but no locations.

```typescript
for (const error of result.errors) {
  if (error.source === "json-schema") {
    error.instanceLocation; // A ValidationError's
  }
}
```

## Messages

Errors don't come with messages. A good message depends on who's reading
it, so it's left to you or to another output format.

`outputErrorMessage` gives an error a generic message, which is fine for
logs and for developers:

```typescript
import { outputErrorMessage } from "@hyperjump/json-schema";

for (const error of result.errors) {
  console.log(outputErrorMessage(error));
}
```

```text
'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'
The instance fails the constraint at 'https://example.com/person#/required'
```

To write your own, switch on `ruleId` and use `instanceLocation`. For the
keyword's value, look it up at `absoluteKeywordLocation` in your schema.

To report errors with the line and column, such as in an editor or on the
command line, `toVFileMessage` makes an error a
[`VFileMessage`](https://github.com/vfile/vfile-message). See
[Reporting errors](../unified/reporting-errors.md).

To add an output format of your own, see
[Custom output formats](../extending/output-formats.md).
