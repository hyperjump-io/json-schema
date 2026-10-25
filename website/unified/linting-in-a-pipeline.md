# Linting in a pipeline

`jsonSchemaResolve` turns a JSON AST into a schema AST, and reports schema
problems. Lint rules are unified plugins that run after it.

```js
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { jsonSchemaResolve } from "@hyperjump/json-schema";
import recommended from "@hyperjump/json-schema/lint/recommended";

const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaResolve, { session: jsonSchema.session() })
  .use(recommended)
  .use(rejsonStringify)
  .process(schemaText);
file.messages; // Lint messages and schema problems, with positions
```
