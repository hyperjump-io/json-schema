# `reference-without-target`

In `recommended`, as an error.

A reference that doesn't find a schema: a file that doesn't exist, a
JSON Pointer or anchor that isn't in the document, or something that
isn't a schema. It checks every static reference (`$ref`), in the same
document or another one, in every dialect.

Only what's certainly missing is reported. A reference to something that
can't be retrieved, such as a URL `allowRetrieval` refuses, or to a schema
that has problems of its own, isn't. See `findSchema`.

It needs the schema to be resolved first (`jsonSchemaResolve`), and
otherwise does nothing. It has no options.

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

> The reference doesn't find a schema. Property 'bar' doesn't exist at file:///home/jdesrosiers/Projects/hyperjump-io/json-schema/.reference-without-target-test-g8xhqg/a.schema.json#/$defs/bar

#### An anchor that isn't in the document

```json
{ "$schema": "https://json-schema.org/v1", "$ref": "#foo" }
```

> The reference doesn't find a schema. There's no 'foo' anchor in 'file:///home/jdesrosiers/Projects/hyperjump-io/json-schema/.reference-without-target-test-g8xhqg/a.schema.json'

#### A dynamic reference that finds nothing

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicRef": "#meta"
}
```

> The reference doesn't find a schema. There's no 'meta' anchor in 'file:///home/jdesrosiers/Projects/hyperjump-io/json-schema/.reference-without-target-test-g8xhqg/a.schema.json'

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
