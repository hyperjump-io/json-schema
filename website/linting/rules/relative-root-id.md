# `relative-root-id`

In `recommended`, as a warning.

A relative `$id` on the root schema of a document, like `/user` or
`user.schema.json`. In draft-04 the keyword is `id`. A relative `$id` is
resolved against the URI the schema was retrieved from. So the same schema
gets a different identifier in each place it's served or saved. References
to it by that identifier break when it moves, and bundling can't keep it.
From draft-06 through v1, the spec says the root SHOULD have an absolute
`$id`. draft-04 doesn't say, but the same problems apply.

These aren't reported:

- A root without `$id`. Identifying a schema by where it lives is common,
  and it isn't ambiguous.
- A fragment-only draft-04–07 `$id`, which is an anchor.
- A relative `$id` on an embedded resource. It's resolved against the
  resource it's in.

The resolver reports an `$id` that isn't a valid URI reference. In a file,
a relative root `$id` resolves to a `file:` URI. The resolver reports that
too, because a schema can't be identified by a file. It has no options.

## Examples

### Reported

#### A relative root $id

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "/user"
}
```

> '/user' is relative, so the schema is identified by resolving it against wherever the schema was retrieved from. Give the root '$id' an absolute URI so the schema has the same identifier wherever it is.

#### A relative root $id in draft-07

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "user.schema.json"
}
```

> 'user.schema.json' is relative, so the schema is identified by resolving it against wherever the schema was retrieved from. Give the root '$id' an absolute URI so the schema has the same identifier wherever it is.

#### A relative root id in draft-04

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "id": "user.schema.json"
}
```

> 'user.schema.json' is relative, so the schema is identified by resolving it against wherever the schema was retrieved from. Give the root 'id' an absolute URI so the schema has the same identifier wherever it is.

### Not reported

#### An absolute root $id

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/user"
}
```

#### No $id

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```
