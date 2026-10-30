# `reference-by-location`

In `recommended`, as a warning.

A reference that finds a schema by where it is rather than by its
identifier. That can be:

- Its file, like `common.schema.json` for a file whose `$id` is
  `https://example.com/common`.
- A URL it was retrieved from that isn't its `$id`.
- A JSON Pointer into an embedded resource, like `#/$defs/embedded` for a
  schema with its own `$id`.

A schema's identifier stays the same wherever the schema is, but its
location doesn't. The reference breaks when the schema moves, and bundling
can't keep it. The spec says a JSON Pointer SHOULD NOT be used to identify
an embedded resource or anything inside one. A schema found both ways
counts as two documents. A tool that has it in a registry by its `$id` sees
one copy, and the reference finds another.

The message gives the identifier, which is the schema resource's `$id`. If
the reference finds something inside the resource, it adds a JSON Pointer
from there. A reference is only reported if its target's identifier also
finds the target. Otherwise the reference couldn't use the identifier.
Every static reference (`$ref`) is checked, in every dialect.

It needs the schema to be resolved first with `jsonSchemaResolve`.
Otherwise it does nothing. It has no options.

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
