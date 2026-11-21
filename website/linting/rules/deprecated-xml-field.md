# `deprecated-xml-field`

In `openapi-3-2`, as a warning.

`attribute` or `wrapped` in OpenAPI 3.2's `xml`. OpenAPI 3.2 deprecated
them in favor of `nodeType`, which says what kind of XML node a schema
is:

| Deprecated | Use |
| --- | --- |
| `"attribute": true` | `"nodeType": "attribute"` |
| `"wrapped": true` | `"nodeType": "element"` |
| `"attribute": false` or `"wrapped": false` | Nothing. `false` is the default. |

OpenAPI 3.0 and 3.1 don't have `nodeType`, so they aren't reported. It has
no options.

## Examples

### Reported

#### An attribute

```json
{
  "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  "type": "string",
  "xml": { "attribute": true }
}
```

> 'attribute' is deprecated. Use '"nodeType": "attribute"' instead.

#### A wrapped array

```json
{
  "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  "type": "array",
  "items": { "type": "string" },
  "xml": { "wrapped": true }
}
```

> 'wrapped' is deprecated. Use '"nodeType": "element"' instead.

#### The default

```json
{
  "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  "type": "string",
  "xml": { "attribute": false }
}
```

> 'attribute' is deprecated. Remove it. 'false' is the default.

### Not reported

#### Node type

```json
{
  "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  "type": "string",
  "xml": { "nodeType": "attribute" }
}
```

#### In OpenAPI 3.1

```json
{
  "$schema": "https://spec.openapis.org/oas/3.1/dialect/2024-11-10",
  "type": "string",
  "xml": { "attribute": true }
}
```
