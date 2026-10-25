# `mergeable-all-of-schema`

Not in a preset.

A schema in `allOf` whose keywords can be moved into the schema the
`allOf` is in without changing what's valid, so wrapping it in `allOf`
isn't needed. It's a matter of style, because composing schemas in
`allOf` can be clearer, so it isn't in `recommended`.

A schema can't be moved if a keyword in it is already there, from the
schema or from a schema before it that can be moved, except that
`properties` and other maps are combined if they don't have a name in
common, and `required` is always combined. It can't be moved next to a
keyword it reads, or one that reads it, like `additionalProperties` and
`properties`, or `if` and `then`, because that changes what it means.
That comes from each keyword's `siblings`, so it works for custom
keywords too. Neither can a schema with an identifier, like `$id` or
`$anchor` (a keyword with a `resolve` hook), or definitions, whose URIs
would change, or one with a keyword that reads what its siblings
evaluated, like `unevaluatedProperties`. From 2019-09, `$ref` is a
keyword like any other, so `allOf: [{ "$ref": … }]` is reported. In
draft-04 through draft-07, a schema that's a `$ref` replaces the schema
it's in, so it's only reported if it's the only schema in `allOf` and
there's nothing but `allOf` in the schema it's in. Booleans aren't
reported.

It only looks at the schema with `allOf` and the schemas in it, not at
what they reference, so it doesn't matter what a `$ref` refers to. A reference into a schema in `allOf`, like
`#/allOf/0/properties/a`, would need to change too, which this rule
doesn't look for. It has no options.

## Examples

### Reported

#### A schema that can be moved

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "type": "string", "minLength": 5 }]
}
```

> This schema's keywords can be moved into the schema 'allOf' is in

#### $ref is a keyword, from 2019-09

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": { "a": {} },
  "allOf": [{ "$ref": "#/$defs/a" }, { "required": ["b"] }]
}
```

> This schema's keywords can be moved into the schema 'allOf' is in
>
> This schema's keywords can be moved into the schema 'allOf' is in

#### A draft-07 $ref that's the only thing in the schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": { "a": {} },
  "properties": { "foo": { "allOf": [{ "$ref": "#/definitions/a" }] } }
}
```

> This schema can replace the schema 'allOf' is in

### Not reported

#### $ref is a keyword, from 2019-09

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": { "a": {} },
  "$ref": "#/$defs/a",
  "allOf": [{ "$ref": "#/$defs/a" }]
}
```

#### What a $ref refers to doesn't matter

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": { "a": { "allOf": [{ "$anchor": "x" }] } },
  "properties": { "foo": { "$ref": "#/$defs/a" } }
}
```
