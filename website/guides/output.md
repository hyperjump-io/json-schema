# Output and errors

By default, validation only says whether a value is valid. To find out why
it isn't, ask for an output format with the `output` option.

```javascript
const result = validator.validate({ age: -1 }, { output: "BASIC" });
```

| Output | Result | Use it for |
| --- | --- | --- |
| `"FLAG"` (the default) | `true` or `false` | Only whether it's valid. It's the fastest. |
| `"BASIC"` | `{ valid, errors }`, with a flat list of errors | Reporting each problem |
| `"DETAILED"` | `{ valid, errors }`, with errors nested by schema structure | Explaining how a failure in a subschema made its parent fail |

Asking for errors doesn't slow down valid values. A value is checked the
fast way first, and its errors are only worked out if it's invalid.

## BASIC

A list of every keyword that failed, in document order.

```javascript
validator.validate({ age: -1 }, { output: "BASIC" });
// {
//   valid: false,
//   errors: [
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/minimum",
//       absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//       instanceLocation: "/age",
//       place: undefined
//     },
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/required",
//       absoluteKeywordLocation: "https://example.com/person#/required",
//       instanceLocation: "",
//       place: undefined
//     }
//   ]
// }
```

A keyword whose failure is explained by its subschemas, like `properties`
failing because `/age` failed `minimum`, doesn't get an error of its own.
The errors that explain it are enough.

## DETAILED

The same errors, nested under the keywords that applied them. Here,
`minimum` is under the `properties` that applied its schema to `/age`.

```javascript
validator.validate({ age: -1 }, { output: "DETAILED" });
// {
//   valid: false,
//   errors: [
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/properties",
//       absoluteKeywordLocation: "https://example.com/person#/properties",
//       instanceLocation: "",
//       place: undefined,
//       errors: [
//         {
//           source: "json-schema",
//           ruleId: "https://json-schema.org/keyword/minimum",
//           absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//           instanceLocation: "/age",
//           place: undefined
//         }
//       ]
//     },
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/required",
//       absoluteKeywordLocation: "https://example.com/person#/required",
//       instanceLocation: "",
//       place: undefined
//     }
//   ]
// }
```

## What's in an error

A validation error is plain data:

| Property | What it is |
| --- | --- |
| `source` | `"json-schema"` |
| `ruleId` | The URI of the keyword that failed, like `https://json-schema.org/keyword/minimum`. It's the same in every dialect that has the keyword, so you can tell what failed without knowing which dialect the schema is in. |
| `absoluteKeywordLocation` | Where the keyword is: the schema's URI, with a JSON Pointer to the keyword |
| `instanceLocation` | A JSON Pointer to the value that failed. `""` is the whole value. |
| `place` | The line and column of the value in the JSON text, if it was validated from text |
| `errors` | `DETAILED` only: the errors that made this keyword fail |

When validating [JSON text](validating.md#json-text), a syntax error is in
`errors` too. It has a `source` of `"json"`, a `ruleId` like
`"trailing-comma"`, and a `place`, but no locations.

## Messages

Errors don't come with messages. A good message depends on who's reading
it, so it's left to you or to another output format.

`outputErrorMessage` gives an error a generic message, which is fine for
logs and for developers:

```javascript
import { outputErrorMessage } from "@hyperjump/json-schema";

outputErrorMessage(result.errors[0]);
// "'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'"
```

To write your own, switch on `ruleId` and use `instanceLocation`. For the
keyword's value, look it up at `absoluteKeywordLocation` in your schema.

To report errors with the line and column, such as in an editor or on the
command line, `toVFileMessage` makes an error a
[`VFileMessage`](https://github.com/vfile/vfile-message). See
[Reporting errors](../unified/reporting-errors.md).

To add an output format of your own, see
[Custom output formats](../extending/output-formats.md).
