# Validating JSON files

`jsonSchemaValidate` is a unified plugin that validates a JSON AST against a
compiled schema, so you decide where schemas come from.

```js
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { jsonSchemaValidate } from "@hyperjump/json-schema";

const validator = await jsonSchema.compile("https://example.com/person");
const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaValidate, { validator })
  .use(rejsonStringify)
  .process(json);
file.messages; // Syntax errors and validation errors, with positions
```
