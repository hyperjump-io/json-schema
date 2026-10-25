# `relative-root-id`

In `recommended`, as a warning.

A relative `$id` (`id` in draft-04) on the root schema of a document, like
`/user` or `user.schema.json`. It's resolved against the URI the schema was
retrieved from, so the same schema has a different identifier in each
place it's served or saved, references to it by that identifier break
when it moves, and bundling can't keep it. The spec says the root SHOULD
have an absolute one in draft-06 through v1. draft-04 doesn't say, but the
same problems apply.

A root without `$id`, or with a fragment-only draft-04–07 `$id`, which is
an anchor, isn't reported: a schema identified by where it lives is common,
and nothing about it is ambiguous. A relative `$id` on an embedded resource
is resolved against the resource it's in, so it isn't reported either. An
`$id` that isn't a valid URI reference is reported by the resolver. It has
no options.

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
