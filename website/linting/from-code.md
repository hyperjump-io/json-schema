# Linting from code

`lint` lints a schema document and returns what it finds as data. Use it to
lint schemas in a tool of your own, or to check schemas your users give you
before accepting them.

```typescript
import { lint } from "@hyperjump/json-schema";

const results = await lint(jsonSchema, "https://example.com/person");

for (const result of results) {
  console.log(`${result.severity}: ${result.message} (${result.url})`);
}
```

```text
warn: 'then' has no effect without 'if' (https://hyperjump.io/json-schema/linting/rules/then-else-without-if/)
```

It finds the schema the way `compile` does, so the URI can be in a registry,
a file, or anywhere [`allowRetrieval`](../guides/retrieval.md) allows.

## What's linted

- The whole document the URI is in, including definitions nothing
  references.
- Not the documents it references. Rules can look at them, such as to check
  that a `$ref` finds a schema, but their problems aren't reported. Lint
  them separately.

## Results

Each result is a `SchemaMessage`, a plain object:

| Property | What it is |
| --- | --- |
| `message` | What the rule found |
| `ruleId` | The rule's name, like `"then-else-without-if"` |
| `severity` | `"error"` or `"warn"` |
| `url` | The rule's page, for built-in rules |
| `uri` | The URI of the document |
| `place` | The position in the document, if it was JSON text |
| `source` | `"json-schema-lint"` for lint rules, `"json-schema"` for schema problems |

`toVFileMessage` makes one a
[`VFileMessage`](https://github.com/vfile/vfile-message), which prints with
its position.

A schema with problems can't be linted, so its problems are returned
instead, as results with a `severity` of `"error"`. `lint` doesn't throw
for them, so check for errors before using the schema.

```typescript
const hasErrors = results.some((result) => result.severity === "error");
```

## Choosing rules

The default is the recommended preset. Pass `plugins` to choose others, in
the same shape as [the CLI's configuration](choosing-rules.md), with the
modules imported instead of named.

```typescript
import recommended from "@hyperjump/json-schema/lint/recommended";
import thenElseWithoutIf from
  "@hyperjump/json-schema/lint/rules/then-else-without-if";

const results = await lint(jsonSchema, "https://example.com/person", {
  plugins: [recommended, [thenElseWithoutIf, ["error"]]]
});
results[0].severity; // "error"
```
