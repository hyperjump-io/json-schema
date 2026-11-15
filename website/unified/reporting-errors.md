# Reporting errors

`toVFileMessage` turns a validation error, a syntax error, or a schema
problem into a [`VFileMessage`](https://github.com/vfile/vfile-message). The
message includes the text, the position if there is one, the `ruleId`, and
the `source`. It prints like the messages of other unified tools.

```typescript
import { BASIC, toVFileMessage, validate } from "@hyperjump/json-schema";

const result = await validate(config, uri, json, { input: "json", output: BASIC });

for (const error of result.errors) {
  console.log(String(toVFileMessage(error)));
}
```

```text
1:27-1:29: Fails the constraint at 'https://example.com/person#/properties/age/minimum'
1:29-1:30: Trailing commas are not allowed
```

Use it to report errors with unified tooling without building a pipeline.
It works on errors from validating JSON text, a `SchemaError`'s `messages`,
and results from [`lint`](../linting/from-code.md).

The text comes from [`outputErrorMessage`](../guides/output.md#messages),
which is generic. To write your own messages, make the `VFileMessage`
yourself with the error's `place`, `ruleId`, and `source`.

To add an error to a `VFile`, call `file.message` with those values instead
of adding the `VFileMessage`:

```typescript
file.message(myMessage(error), {
  place: error.place,
  ruleId: error.ruleId,
  source: error.source
});
```
