# `reference-without-target`

In `recommended`, as an error.

A reference that doesn't find a schema. It might point to a file that
doesn't exist, a JSON Pointer or anchor that isn't in the document, or
something that isn't a schema. It checks every static reference (`$ref`)
in every dialect, whether it points into the same document or another
one.

Only targets that are certainly missing are reported. Some targets can't
be checked, so they aren't reported. That includes a URL that
`allowRetrieval` refuses and a schema that has problems of its own.

It needs the schema to be resolved first with `jsonSchemaResolve`.
Otherwise it does nothing. It has no options.

## Examples

### Reported

#### A JSON Pointer into the same document that finds nothing

```json
{
  "$schema": "https://json-schema.org/v1",
  "$ref": "#/$defs/bar",
  "$defs": { "foo": true }
}
```

> The reference doesn't find a schema. Property 'bar' doesn't exist at https://example.com/schema.json#/$defs/bar

#### An anchor that isn't in the document

```json
{ "$schema": "https://json-schema.org/v1", "$ref": "#foo" }
```

> The reference doesn't find a schema. There's no 'foo' anchor in 'https://example.com/schema.json'

#### A dynamic reference that finds nothing

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicRef": "#meta"
}
```

> The reference doesn't find a schema. There's no 'meta' anchor in 'https://example.com/schema.json'

### Not reported

#### A JSON Pointer into the same document that finds a schema

```json
{
  "$schema": "https://json-schema.org/v1",
  "$ref": "#/$defs/foo",
  "$defs": { "foo": true }
}
```

#### A dynamic reference that finds a schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",
  "$dynamicRef": "#meta"
}
```
