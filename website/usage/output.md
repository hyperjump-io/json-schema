# Output

The default output is FLAG: just a boolean, which is the fastest. Use BASIC or
DETAILED to find out why an instance is invalid.

```javascript
const result = validator.validate({ age: -1 }, { output: "BASIC" });
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
//     ...
//   ]
// }
```

- BASIC is a flat list of errors.
- DETAILED nests errors by schema structure.

Errors from the built-in output formats are plain data, without messages.
Writing messages that explain errors is left to other output formats. Add your
own with `addOutputFormat`. `outputErrorMessage` gives an error a generic
message.

```javascript
import { outputErrorMessage } from "@hyperjump/json-schema";

outputErrorMessage(result.errors[0]);
// "'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'"
```
