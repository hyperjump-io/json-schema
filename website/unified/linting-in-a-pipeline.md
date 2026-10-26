# Linting in a pipeline

To lint a schema in a unified pipeline, parse it, turn it into a schema AST
with `jsonSchemaResolve`, then add the lint rules as plugins.

```javascript
import { unified } from "unified";
import { VFile } from "vfile";
import { reporter } from "vfile-reporter";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { jsonSchemaResolve } from "@hyperjump/json-schema";
import recommended from "@hyperjump/json-schema/lint/recommended";

const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaResolve, { session: jsonSchema.session() })
  .use(recommended)
  .use(rejsonStringify)
  .process(new VFile({ path: "person.schema.json", value: schemaText }));

console.log(reporter(file));
```

```text
person.schema.json
10:3-10:34 warning 'then' has no effect without 'if' then-else-without-if jsonschema-lint

⚠ 1 warning
```

Here, `schemaText` is a schema with a `then` but no `if`.

## `jsonSchemaResolve`

It works out what every part of the schema is: the dialect of each schema,
which properties are keywords, the embedded schemas, and the anchors. Lint
rules need that to know what they're looking at.

Problems that make the schema invalid, like a missing dialect or a keyword
with the wrong type of value, are added to the file as errors. They aren't
thrown, so every problem in the file is reported.

| Option | What it is |
| --- | --- |
| `session` | A session from your `JsonSchema`, which has the dialects and keywords. Rules use it to find the schemas the document references, so it decides what they can see. See [Controlling retrieval](../guides/retrieval.md). |
| `uri` | The schema's base URI. The default is the file's path, as a `file:` URL. |
| `dialectUri` | The dialect, if the schema doesn't have `$schema`. The default is the `JsonSchema`'s `defaultDialectUri`. |

It's asynchronous, because a dialect from a custom meta-schema has to be
retrieved first.

## Rules

Rules are unified plugins. Each takes its setting the way it's configured
anywhere else (see [Choosing rules](../linting/choosing-rules.md)):

```javascript
import thenElseWithoutIf from
  "@hyperjump/json-schema/lint/rules/then-else-without-if";

unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaResolve, { session: jsonSchema.session() })
  .use(recommended)
  .use(thenElseWithoutIf, ["error"]);
```

Rules run after `jsonSchemaResolve`. A schema with problems isn't linted,
so you only see the problems until they're fixed.

For linting without a pipeline, see [Linting from code](../linting/from-code.md).
