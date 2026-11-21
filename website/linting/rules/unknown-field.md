# `unknown-field`

In `openapi-3-0`, as a warning. In `openapi-3-1`, as a warning. In
`openapi-3-2`, as a warning.

A field that OpenAPI's Discriminator, External Documentation, or XML Object
doesn't define. Those objects are the values of `discriminator`,
`externalDocs`, and `xml`. OpenAPI doesn't forbid other fields, so this is
a lint rule rather than an error. But tools ignore them, so it's usually a
typo, like `propertyname` for `propertyName`. If the field is a known one
in a different case, the message says which.

Fields that start with `x-` are Specification Extensions, which every one
of these objects allows, so they aren't reported.

Each version defines its own fields:

| Object | Fields |
| --- | --- |
| Discriminator | `propertyName`, `mapping`, and in 3.2, `defaultMapping` |
| External Documentation | `description`, `url` |
| XML | `name`, `namespace`, `prefix`, `attribute`, `wrapped`, and in 3.2, `nodeType` |

It has no options.

## Examples

### Reported

#### A typo

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "object",
  "discriminator": { "propertyname": "kind" }
}
```

> 'propertyname' isn't a field of the Discriminator Object, so tools ignore it. Did you mean 'propertyName'?

#### A field from a later version

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "object",
  "xml": { "nodeType": "element" }
}
```

> 'nodeType' isn't a field of the XML Object, so tools ignore it.

### Not reported

#### Extension fields

```json dialect=https://spec.openapis.org/oas/3.0/dialect
{
  "type": "object",
  "externalDocs": {
    "url": "https://example.com/docs",
    "x-internal": true
  }
}
```
