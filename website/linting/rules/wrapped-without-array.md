# `wrapped-without-array`

In `openapi-3-0`, as a warning. In `openapi-3-1`, as a warning. In
`openapi-3-2`, as a warning.

`wrapped: true` in OpenAPI's `xml`, in a schema whose `type` isn't
`array`. `wrapped` says whether an array's items are inside an element of
their own, so it has no effect anywhere else. OpenAPI says it may be used
only for an array definition.

Only the `type` next to `xml` counts. One in an `allOf` doesn't, and
neither does the array around an `items` schema, because `wrapped` belongs
on the array's own schema. `wrapped: false` is the default, so it isn't
reported. In OpenAPI 3.2, `wrapped` is deprecated, and
[`deprecated-xml-field`](deprecated-xml-field.md) reports it too. It has
no options.

## Examples

### Reported

#### A string

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "string",
  "xml": { "wrapped": true }
}
```

> 'wrapped' has no effect, because it only applies to a schema whose type is 'array'

#### On the items

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "array",
  "items": {
    "type": "string",
    "xml": { "wrapped": true }
  }
}
```

> 'wrapped' has no effect, because it only applies to a schema whose type is 'array'

### Not reported

#### An array

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "array",
  "items": { "type": "string" },
  "xml": { "wrapped": true }
}
```
