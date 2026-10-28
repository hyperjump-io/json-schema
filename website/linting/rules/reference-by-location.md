# `reference-by-location`

In `recommended`, as a warning.

A reference that finds a schema by where it is rather than by its
identifier: by its file, like `common.schema.json` for a file whose
`$id` is `https://example.com/common`, by a URL it was retrieved from
that isn't its `$id`, or by a JSON Pointer into an embedded resource,
like `#/$defs/embedded` for a schema with its own `$id`. A schema's
identifier is the same wherever it is, and its location isn't, so the
reference breaks when the schema moves, and bundling can't keep it. The
spec says a JSON Pointer SHOULD NOT be used to identify an embedded
resource or something in it. A schema found both ways is two documents,
so a tool that has it in a registry by its `$id` sees one copy, and the
reference finds another.

The message gives the identifier, which is the schema resource's `$id`,
with a JSON Pointer from there if the reference finds something in it.
Only a reference whose target's identifier also finds it is reported.
Otherwise the reference couldn't use it. Every static reference (`$ref`)
is checked, in every dialect.

It needs the schema to be resolved first (`jsonSchemaResolve`), and
otherwise does nothing. It has no options.

## Examples

### Reported

#### A JSON Pointer into an embedded resource

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "#/$defs/address",
  "$defs": {
    "address": { "$id": "https://example.com/address", "type": "object" }
  }
}
```

> The reference finds the schema by where it is, not by its identifier, 'https://example.com/address'

#### A JSON Pointer into a schema in an embedded resource

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "#/$defs/address/properties/street",
  "$defs": {
    "address": {
      "$id": "https://example.com/address",
      "properties": { "street": { "type": "string" } }
    }
  }
}
```

> The reference finds the schema by where it is, not by its identifier, 'https://example.com/address#/properties/street'

### Not reported

#### An embedded resource by its identifier

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "https://example.com/address",
  "$defs": {
    "address": { "$id": "https://example.com/address", "type": "object" }
  }
}
```

#### A JSON Pointer into the same resource

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "#/$defs/address",
  "$defs": {
    "address": { "type": "object" }
  }
}
```
