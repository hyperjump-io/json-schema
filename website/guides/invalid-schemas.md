# Invalid schemas

Schemas are validated before they're used. A schema with a mistake, like a
`minLength` of `-1` or a misspelled keyword in v1, can't be compiled, so
`compile` throws a `SchemaError` with every problem in the document.

```javascript
import { SchemaError, toVFileMessage } from "@hyperjump/json-schema";

jsonSchema.addRegistry(new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/bad",
  "minLength": -1,
  "tpye": "string"
}`));

try {
  await jsonSchema.compile("https://example.com/bad");
} catch (error) {
  if (!(error instanceof SchemaError)) {
    throw error;
  }

  for (const message of error.messages) {
    console.log(String(toVFileMessage(message)));
  }
}
```

```text
5:3-5:19: 'tpye' isn't a keyword in the 'https://json-schema.org/v1' dialect
4:16-4:18: Expected a non-negative integer
```

The error's own `message` sums them up:

```text
The schema at 'https://example.com/bad' is invalid: 'tpye' isn't a keyword in the 'https://json-schema.org/v1' dialect (and 1 more problem)
```

`messages` are plain objects:

| Property | What it is |
| --- | --- |
| `message` | What's wrong, like `"Expected a non-negative integer"` |
| `uri` | The URI of the document with the problem |
| `place` | Where the problem is, if the schema was JSON text. Add schemas as text to get it (see [Loading schemas](loading-schemas.md#json-text-or-a-value)). Files and HTTP responses are always text. |
| `ruleId` | What was checked: the keyword's URI for a keyword's value, or an id like `"unknown-keyword"` |
| `source` | `"json-schema"`, or `"json"` for a syntax error |
| `severity` | `"error"` |

`toVFileMessage` makes one a
[`VFileMessage`](https://github.com/vfile/vfile-message), which prints with
its position, as above.

If a schema references another document that has problems, the error is
about the first document found to have any.

## Finding problems before compiling

To see every problem in your schemas during development rather than when
your application starts, lint them. The
[hjlint](https://github.com/hyperjump-io/hjlint/blob/main/website/README.md)
CLI reports schema problems as errors, along with lint warnings, without
compiling anything. From code, [`lint`](../linting/from-code.md) returns a
schema's problems instead of throwing them.
