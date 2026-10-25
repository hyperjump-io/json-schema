# Linting from code

`lint` lints a schema document from code, without a unified pipeline. It
lints the whole document the URI is in, including definitions nothing
references, and not the documents it references. The rules are the
recommended preset, or `plugins` in the same shape as `.hyperjumprc`'s. The
results are plain objects, like the problems in a `SchemaError`, with a
`severity` of `"error"` or `"warn"`. A schema with problems can't be linted,
so its problems are returned instead of thrown.

```javascript
import recommended from "@hyperjump/json-schema/lint/recommended";
import thenElseWithoutIf from "@hyperjump/json-schema/lint/rules/then-else-without-if";

const results = await jsonSchema.lint("https://example.com/person", {
  plugins: [recommended, [thenElseWithoutIf, ["error"]]]
});
results[0]; // { ruleId: "then-else-without-if", severity: "error", message: "'then' has no effect without 'if'", ... }
```
