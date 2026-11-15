# Linting from code

`lint` lints a schema document and returns what it finds as data. Use it to
lint schemas in a tool of your own. You can also use it to check schemas
your users give you before you accept them.

```typescript
import { lint } from "@hyperjump/json-schema";

const results = await lint(config, "https://example.com/person");

for (const result of results) {
  console.log(`${result.severity}: ${result.message} (${result.url})`);
}
```

```text
warn: 'then' has no effect without 'if' (https://hyperjump.io/json-schema/linting/rules/then-else-without-if/)
```

It finds the schema the same way `compile` does. The URI can be in a
registry, a file, or anywhere [`allowRetrieval`](../guides/retrieval.md)
allows.

## What's linted

- The whole document the URI is in, including definitions that nothing
  references.
- Not the documents it references. Rules can look at them, for example to
  check that a `$ref` finds a schema. But their problems aren't reported.
  Lint them separately.

## Results

Each result is a `SchemaMessage`, which is a plain object:

| Property | What it is |
| --- | --- |
| `message` | What the rule found |
| `ruleId` | The rule's name, like `"then-else-without-if"` |
| `severity` | `"error"` or `"warn"` |
| `url` | The rule's page. Only for built-in rules. |
| `uri` | The URI of the document |
| `place` | The position in the document. Only present if it was JSON text. |
| `source` | `"json-schema-lint"` for lint rules, `"json-schema"` for schema problems |

`toVFileMessage` turns one into a
[`VFileMessage`](https://github.com/vfile/vfile-message). It prints with its
position.

A schema with problems can't be linted. Instead, its problems are returned
as results with a `severity` of `"error"`. `lint` doesn't throw for them,
so check for errors before using the schema.

```typescript
const hasErrors = results.some((result) => result.severity === "error");
```

## Choosing rules

The default is the recommended preset. Pass `plugins` to choose other
rules. It has the same shape as [the CLI's configuration](choosing-rules.md),
except that you import the modules instead of naming them.

```typescript
import recommended from "@hyperjump/json-schema/lint/recommended";
import thenElseWithoutIf from
  "@hyperjump/json-schema/lint/rules/then-else-without-if";

const results = await lint(config, "https://example.com/person", {
  plugins: [recommended, [thenElseWithoutIf, ["error"]]]
});
results[0].severity; // "error"
```
