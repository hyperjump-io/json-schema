# Evaluation plugins

Plugins observe an evaluation. They have `beforeSchema`, `afterSchema`,
`beforeKeyword`, `afterKeyword`, and `annotation` hooks. With any plugin, the
instance is evaluated once and nothing stops early, so it's slower.

What plugins see can depend on optimizations, but it's never wrong. A schema
that always passes, like `{}`, might not be evaluated as a schema of its own,
and a keyword that only annotates is left out for plugins without an
`annotation` hook.

`annotation` gets every annotation, even from schemas that fail, so a tool
like a language server can show a `description` in an invalid document.

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

```javascript
const keywords = new Set();
validator.validate(instance, {
  plugins: [{
    afterKeyword(keyword) {
      keywords.add(keyword.absoluteKeywordLocation);
    }
  }]
});
```
