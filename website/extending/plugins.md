# Evaluation plugins

An evaluation plugin observes an evaluation: every schema and keyword that's
evaluated, whether each passed, and every annotation. Plugins can't change
the result. The output formats are plugins, and tools like language servers
use them to see what applied to each part of a document.

Pass plugins to any validation method:

```javascript
const keywords = new Set();
validator.validate(instance, {
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

`at` is where in the instance: its `instanceLocation`, and its `node` when
validating JSON text or annotating. `keyword` has the keyword's
`keywordUri`, its `absoluteKeywordLocation`, and what it lowered to.

Plugins don't share a context object. Each `before` hook returns the
plugin's state for that schema or keyword, and it's passed to the matching
`after` hook and to the hooks of what's evaluated inside it. That's enough
to build nested results, like the `DETAILED` output.

## Every annotation

`annotation` is called for every annotation, even from schemas that fail,
which aren't kept in the result. A language server can use it to show a
`description` in a document that has errors.

```javascript
const descriptions = new Map();
validator.validateJson(json, {
  plugins: [{
    annotation(keyword, at, value) {
      if (keyword.keywordUri === "https://json-schema.org/keyword/description") {
        descriptions.set(at.instanceLocation, value);
      }
    }
  }]
});
```

`afterKeyword` and `afterSchema` say what passed, if you need to tell them
apart.

## Performance

With any plugin, the value is evaluated once, completely, and nothing stops
early, so it's slower than validating without plugins.

What plugins see can depend on optimizations, but it's never wrong. A
schema that always passes, like `{}`, might not be evaluated as a schema of
its own, and a keyword that only annotates is left out for plugins without
an `annotation` hook.
