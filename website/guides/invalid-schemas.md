# Invalid schemas

Schemas are validated before they're used. A schema with a mistake can't be
compiled. A `minLength` of `-1` or a misspelled keyword in v1 are examples.
`compile` throws a `SchemaError` that lists every problem in the document.

```typescript
import { SchemaError, toVFileMessage } from "@hyperjump/json-schema";

jsonSchema.registry = new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/bad",
  "minLength": -1,
  "tpye": "string"
}`);

try {
  await compile(jsonSchema, "https://example.com/bad");
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

The error's own `message` summarizes them:

```text
The schema at 'https://example.com/bad' is invalid: 'tpye' isn't a keyword in the 'https://json-schema.org/v1' dialect (and 1 more problem)
```

`messages` are `SchemaMessage`s, which are plain objects:

| Property | What it is |
| --- | --- |
| `message` | What's wrong, like `"Expected a non-negative integer"` |
| `uri` | The URI of the document with the problem |
| `place` | Where the problem is. Only present if the schema was JSON text. To get it, add schemas as text. See [Loading schemas](loading-schemas.md#json-text-or-a-value). Files and HTTP responses are always text. |
| `ruleId` | What was checked. For a keyword's value, it's the keyword's URI. Otherwise it's an id like `"unknown-keyword"`. |
| `source` | `"json-schema"`, or `"json"` for a syntax error |
| `severity` | `"error"` |

`toVFileMessage` turns one into a
[`VFileMessage`](https://github.com/vfile/vfile-message). It prints with its
position, as shown above.

If a schema references another document that has problems, the error is
about the first document found to have problems.

## Finding problems before compiling

Lint your schemas to see every problem during development instead of when
your application starts. The
[Hyperjump CLI](https://github.com/hyperjump-io/cli/blob/main/website/README.md)
reports schema problems as errors along with lint warnings. It doesn't
compile anything. From code, [`lint`](../linting/from-code.md) returns a
schema's problems instead of throwing them.
