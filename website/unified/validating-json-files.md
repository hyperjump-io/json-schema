# Validating JSON files

`jsonSchemaValidate` validates a JSON file against a compiled schema. You
compile the schema, so you decide where schemas come from.

For this `alice.json`:

```json
{ "name": "Alice", "age": -1, }
```

```typescript
import { readFile } from "node:fs/promises";
import { unified } from "unified";
import { VFile } from "vfile";
import { reporter } from "vfile-reporter";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { compile, jsonSchemaValidate } from "@hyperjump/json-schema";

const compiled = await compile(jsonSchema, "https://example.com/person");

const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaValidate, { compiled })
  .use(rejsonStringify)
  .process(new VFile({
    path: "alice.json",
    value: await readFile("alice.json", "utf8")
  }));

console.log(reporter(file));
```

```text
alice.json
1:27-1:29 error   Fails the constraint at 'https://example.com/person#/properties/age/minimum' https://json-schema.org/keyword/minimum json-schema
1:29-1:30 warning Trailing commas are not allowed                                              trailing-comma                          json

2 messages (✖ 1 error, ⚠ 1 warning)
```

Validation errors are added as errors (`fatal: true`), with the position of
the value that failed, a generic message, the keyword's URI as `ruleId`, and
`json-schema` as `source`. The tree isn't changed.

Syntax errors are reported by the parser. A file the parser recovered from
is validated as far as it could be parsed. Values that couldn't be parsed
aren't validated, so they only have their syntax error.

Without `accept: "recovered"`, any syntax error stops the file before it's
validated, and `process` rejects with it.
