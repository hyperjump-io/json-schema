# Linting in a pipeline

To lint a schema in a unified pipeline, parse it and turn it into a schema
AST with `jsonSchemaResolve`. Then add the lint rules as plugins.

```typescript
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
10:3-10:34 warning 'then' has no effect without 'if' then-else-without-if json-schema-lint

⚠ 1 warning
```

Here, `schemaText` is a schema with a `then` but no `if`.

## `jsonSchemaResolve`

It works out what every part of the schema is. That includes the dialect of
each schema, which properties are keywords, the embedded schemas, and the
anchors. Lint rules need this to know what they're looking at.

Problems that make the schema invalid are added to the file as errors. A
missing dialect or a keyword with the wrong type of value are examples.
They aren't thrown, so every problem in the file is reported.

| Option | What it is |
| --- | --- |
| `session` | A session from your `JsonSchema`. It has the dialects and keywords. Rules use it to find the schemas the document references, so it decides what they can see. See [Controlling retrieval](../guides/retrieval.md). |
| `uri` | The schema's base URI. The default is the file's path as a `file:` URL. |
| `dialectUri` | The dialect to use if the schema doesn't have `$schema`. The default is the `JsonSchema`'s `defaultDialectUri`. |

It's asynchronous because a dialect from a custom meta-schema has to be
retrieved first.

Outside a pipeline, `resolveSchema(tree, options)` does the same, for a
JSON AST from browser's `fromJson`. It takes the same options, with `uri`
required, and returns the schema AST and its problems as data
(`{ document, messages }`) instead of adding them to a file.

## Rules

Rules are unified plugins. Each one takes its setting the same way it's
configured anywhere else. See [Choosing rules](../linting/choosing-rules.md):

```typescript
import thenElseWithoutIf from
  "@hyperjump/json-schema/lint/rules/then-else-without-if";

unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaResolve, { session: jsonSchema.session() })
  .use(recommended)
  .use(thenElseWithoutIf, ["error"]);
```

Rules run after `jsonSchemaResolve`. A schema with problems isn't linted.
You only see those problems until they're fixed.

For linting without a pipeline, see [Linting from code](../linting/from-code.md).
