# `ignored-ref-siblings`

In `recommended`, as a warning.

A property next to `$ref` in draft-04 through draft-07. In those drafts,
`$ref` replaces the whole schema, so every other property is ignored. That
includes keywords, annotations like `description`, identifiers, and
`definitions`. A reference into ignored `definitions` doesn't find a
schema. 2019-09 and later evaluate `$ref` alongside its siblings.

`$schema` isn't reported, because it decides the dialect, and the dialect
is what makes `$ref` replace the schema. `$comment` isn't reported,
because a comment never has an effect. It has no options.

## Examples

### Reported

#### A keyword next to $ref

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": { "a": {} },
  "properties": { "foo": { "$ref": "#/definitions/a", "minimum": 0 } }
}
```

> 'minimum' is ignored, because '$ref' replaces the schema it's in

#### Every sibling is reported

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": { "a": {} },
  "properties": {
    "foo": {
      "description": "a foo",
      "$ref": "#/definitions/a",
      "type": "integer"
    }
  }
}
```

> 'description' is ignored, because '$ref' replaces the schema it's in
>
> 'type' is ignored, because '$ref' replaces the schema it's in

#### At the root, where $schema isn't ignored, but definitions are

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$ref": "#/definitions/a",
  "definitions": { "a": {} }
}
```

> 'definitions' is ignored, because '$ref' replaces the schema it's in

### Not reported

#### $comment isn't reported

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": { "a": {} },
  "items": { "$ref": "#/definitions/a", "$comment": "an a" }
}
```

#### $ref alone

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": { "a": {} },
  "items": { "$ref": "#/definitions/a" }
}
```
