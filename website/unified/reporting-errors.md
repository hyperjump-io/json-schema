# Reporting errors

`toVFileMessage` turns a validation error, a syntax error, or a schema
problem into a [`VFileMessage`](https://github.com/vfile/vfile-message). It
has a message, the position if there is one, the `ruleId`, and the
`source`, so it prints like the messages of other unified tools.

```javascript
import { toVFileMessage } from "@hyperjump/json-schema";

const result = validator.validateJson(json, { output: "BASIC" });

for (const error of result.errors) {
  console.log(String(toVFileMessage(error)));
}
```

```text
1:27-1:29: Fails the constraint at 'https://example.com/person#/properties/age/minimum'
1:29-1:30: Trailing commas are not allowed
```

Use it to report errors from `validateJson`, from a `SchemaError`'s
`messages`, or from [`lint`](../linting/from-code.md) with unified
tooling, without building a pipeline.

The message is from
[`outputErrorMessage`](../guides/output.md#messages), which is generic. To
write your own messages, make the `VFileMessage` yourself with the error's
`place`, `ruleId`, and `source`.

To add an error to a `VFile`, use `file.message` with those, instead of
adding the `VFileMessage`:

```javascript
file.message(myMessage(error), {
  place: error.place,
  ruleId: error.ruleId,
  source: error.source
});
```
