# `misplaced-dialect`

In `recommended`, as an error.

`$schema` where the dialect of the schema it's in doesn't allow it. In
2019-09 and later, it's allowed at the root of a schema resource: the
document's root, or a schema with an `$id`. In draft-04 through draft-07,
it's only allowed at the document's root. The specs say it must not appear
anywhere else.

Where a schema resource doesn't start, this implementation ignores it and
reads the schema in its parent's dialect. It does use one at the root of
an embedded resource in draft-04 through draft-07, and one next to `$ref`,
where it decides what `$ref` means. Other implementations might not do
either, so it's an error in the recommended preset. It has no options.

## Examples

### Reported

#### In a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "string"
    }
  }
}
```

> '$schema' is only allowed at the root of a schema resource. It's ignored.

#### Naming the same dialect in a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "items": { "$schema": "https://json-schema.org/draft/2020-12/schema" }
}
```

> '$schema' is only allowed at the root of a schema resource. It's ignored.

#### At the root of an embedded resource in draft-07

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "a": {
      "$id": "https://example.com/a",
      "$schema": "https://json-schema.org/draft/2020-12/schema"
    }
  }
}
```

> '$schema' is only allowed at the root of the document in draft-07. Other implementations might ignore it.

### Not reported

#### At the root of an embedded resource in 2020-12

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "a": {
      "$id": "https://example.com/a",
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  }
}
```
