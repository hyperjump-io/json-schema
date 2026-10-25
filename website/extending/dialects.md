# Custom dialects

A dialect maps keyword names to keyword URIs and says what unknown keywords
mean. Most custom dialects don't need code:

- **To add keywords or formats to a dialect**, use `extendDialect`, as in
  [Custom keywords](keywords.md).
- **In 2019-09 and 2020-12**, a meta-schema with `$vocabulary` defines its
  own dialect. See [Dialects](../guides/dialects.md#custom-meta-schemas).

Use `addDialect` for a dialect whose meta-schema doesn't define it, like one
based on draft-07, or one whose meta-schema describes itself.

```javascript
addV1(jsonSchema); // Adds the built-in keywords this dialect uses

jsonSchema.addDialect({
  uri: "https://example.com/dialect",
  keywords: {
    $id: "https://json-schema.org/keyword/id",
    $ref: "https://json-schema.org/keyword/ref",
    $defs: "https://json-schema.org/keyword/definitions",
    type: "https://json-schema.org/keyword/type",
    properties: "https://json-schema.org/keyword/properties",
    even: "https://example.com/keyword/even"
  },
  formats: {
    hex: "https://example.com/format/hex"
  },
  unknownKeywords: "error",
  assertFormats: true
});
```

```json
{
  "$schema": "https://example.com/dialect",
  "type": "object",
  "properties": {
    "count": { "type": "integer", "even": true }
  }
}
```

| Property | What it is |
| --- | --- |
| `uri` | The dialect's URI, which schemas use as `$schema` |
| `keywords` | Keyword names, mapped to keyword URIs. `$schema` is in every dialect, so leave it out. Names can't start with `x-`, which are for schema authors. |
| `unknownKeywords` | What a property that isn't a keyword means: `"error"`, `"annotation"`, or `"ignore"` |
| `formats` | Format names, mapped to format URIs |
| `assertFormats` | Whether `format` validates by default |

Every keyword and format must have been added. The built-in ones are added
with their dialects, so add a dialect that has a keyword, like
`addV1(jsonSchema)`, before using its keywords in your own. A built-in
keyword's URI is in the dialect it's from, like `v1Dialect.keywords.type`.

A dialect only has the keywords you give it, even `$id` and `$ref`. Without
`$id`, a schema in your dialect has no identifier.

A dialect's URI should be the URI of its meta-schema, so tools that
retrieve `$schema` find one.

To replace a dialect, remove it first with `removeDialect`.
