# `misplaced-vocabulary`

In `recommended`, as an error.

`$vocabulary` anywhere but the document's root, in 2019-09 and 2020-12.
`$vocabulary` says which vocabularies a meta-schema's dialect has. The
specs say it belongs at the root of a meta-schema's document, and must not
appear in subschemas.

Where a schema resource doesn't start, this implementation ignores it. It
does use one at the root of a schema with an `$id`, so a meta-schema
embedded in a bundle defines its dialect. Other implementations might not,
so it's an error in the recommended preset. It has no options.

## Examples

### Reported

#### In a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
    "foo": {
      "$vocabulary": { "https://json-schema.org/draft/2020-12/vocab/core": true }
    }
  }
}
```

> '$vocabulary' is only allowed at the root of the document. It's ignored.

#### At the root of an embedded resource

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "meta": {
      "$id": "https://example.com/meta",
      "$vocabulary": { "https://json-schema.org/draft/2020-12/vocab/core": true }
    }
  }
}
```

> '$vocabulary' is only allowed at the root of the document. Other implementations might ignore it.

### Not reported

#### At the root

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$vocabulary": { "https://json-schema.org/draft/2020-12/vocab/core": true }
}
```
