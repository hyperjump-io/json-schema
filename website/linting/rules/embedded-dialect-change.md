# `embedded-dialect-change`

In `recommended`, as a warning.

An embedded schema resource whose `$schema` names a different dialect from
the 2019-09 schema it's in. 2019-09 allows `$schema` at the root of a
schema with an `$id`, but says a document's schema resources should all
have the same `$schema`, and leaves what a different one does up to the
implementation. This implementation reads it in the dialect it names, but
another might not.

2020-12 and later allow any dialect there. Draft-04 through draft-07 don't
allow `$schema` there at all, which
[`misplaced-dialect`](misplaced-dialect.md) reports. It has no options.

## Examples

### Reported

#### An embedded resource in another dialect in 2019-09

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$defs": {
    "a": {
      "$id": "https://example.com/a",
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  }
}
```

> '$schema' names a different dialect from the schema it's in. 2019-09 says a document's schema resources should have the same dialect.

### Not reported

#### The same dialect

```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$defs": {
    "a": {
      "$id": "https://example.com/a",
      "$schema": "https://json-schema.org/draft/2019-09/schema"
    }
  }
}
```

#### In 2020-12, which allows any dialect

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "a": {
      "$id": "https://example.com/a",
      "$schema": "https://json-schema.org/draft/2019-09/schema"
    }
  }
}
```
