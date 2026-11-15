# Evaluation plugins

An evaluation plugin observes an evaluation. It sees every schema and
keyword that's evaluated, whether each one passed, and every annotation.
Plugins can't change the result. The output formats are plugins. Tools like
language servers use plugins to see what applied to each part of a
document.

Pass plugins to `validate`, `validator`, `annotate`, or `annotator`. A
validator's plugins are chosen when it's made. Each value it validates is
evaluated with the same plugin objects.

```typescript
const keywords = new Set<string>();
await validate(config, uri, instance, {
  plugins: [{
    afterKeyword(keyword, at, valid) {
      keywords.add(keyword.absoluteKeywordLocation);
    }
  }]
});
```

## Hooks

| Hook | Called |
| --- | --- |
| `beforeSchema(schema, at, parent)` | Before a schema is evaluated |
| `afterSchema(schema, at, valid, state, parent)` | After a schema is evaluated, with whether it passed |
| `beforeKeyword(keyword, at, schema)` | Before a keyword is evaluated |
| `afterKeyword(keyword, at, valid, state, schema)` | After a keyword is evaluated |
| `annotation(keyword, at, value, state)` | When a keyword annotates the value |

`at` says where in the instance the evaluation is. It has the
`instanceLocation`. When validating JSON text or annotating, it also has the
`node`. `keyword` has the keyword's `keywordUri`, its
`absoluteKeywordLocation`, and what it lowered to.

Plugins don't share a context object. Instead, each `before` hook returns
the plugin's state for that schema or keyword. That state is passed to the
matching `after` hook and to the hooks of everything evaluated inside it.
That's enough to build nested results, like the `DETAILED` output.

A plugin is an `EvaluationPlugin<S, K>`. `S` is the type of the state
`beforeSchema` returns, and `K` is the type of the state `beforeKeyword`
returns. A plugin written inline in the `plugins` option gets its hooks'
parameter types from the option. Declare a plugin written elsewhere with
`satisfies`:

```typescript
import type { EvaluationPlugin } from "@hyperjump/json-schema";

const depth = {
  beforeSchema: (_schema, _at, parent) => (parent ?? 0) + 1,
  beforeKeyword: (_keyword, _at, schema) => schema
} satisfies EvaluationPlugin<number, number>;
```

## Every annotation

`annotation` is called for every annotation, even ones from schemas that
fail. Those aren't kept in the result. A language server can use this hook
to show a `description` in a document that has errors.

```typescript
import type { Json } from "@hyperjump/browser";

const description = "https://json-schema.org/keyword/description";
const descriptions = new Map<string, Json>();
await validate(config, uri, json, {
  input: "json",
  plugins: [{
    annotation(keyword, at, value) {
      if (keyword.keywordUri === description) {
        descriptions.set(at.instanceLocation, value);
      }
    }
  }]
});
```

If you need to tell which annotations come from passing schemas, use
`afterKeyword` and `afterSchema`. They say what passed.

## Performance

With any plugin, the value is evaluated completely in one pass. Nothing
stops early, so it's slower than validating without plugins.

What plugins see can depend on optimizations, but it's never wrong. A
schema that always passes, like `{}`, might not be evaluated as a separate
schema. A keyword that only annotates is skipped for plugins that don't
have an `annotation` hook.
