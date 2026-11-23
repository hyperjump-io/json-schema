# `read-only-and-write-only`

In `recommended`, as a warning.

`readOnly` and `writeOnly` both `true` in the same schema. A read-only
value can't be changed, and a write-only value is never retrieved, so the
value can't be used at all. One of them is probably a mistake. The JSON
Schema specs allow it, so this is a lint rule rather than an error.
OpenAPI 3.0 says a property MUST NOT be both, so it's an error in
[`@hyperjump/openapi`'s `openapi-3-0` preset](https://github.com/hyperjump-io/openapi/blob/main/website/linting/README.md). OpenAPI
3.1 and later follow JSON Schema.

It only looks at one schema at a time. The annotations also combine across
schemas that apply to the same value, such as two in an `allOf`. But which
ones apply depends on the instance. It has no options.

## Examples

### Reported

#### `readOnly` and `writeOnly` both `true`

```json
{
  "$schema": "https://json-schema.org/v1",
  "readOnly": true,
  "writeOnly": true
}
```

> 'readOnly' and 'writeOnly' are both true, so the value is never retrieved and can't be changed

### Not reported

#### Only one is true

```json
{
  "$schema": "https://json-schema.org/v1",
  "readOnly": true,
  "writeOnly": false
}
```

#### In different schemas

```json
{
  "$schema": "https://json-schema.org/v1",
  "readOnly": true,
  "properties": { "foo": { "writeOnly": true } }
}
```
