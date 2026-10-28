# `mergeable-schemas`

In `recommended`, as a warning.

A schema whose keywords can be moved into the schema it's in without
changing what's valid, so wrapping it isn't needed: a schema in `allOf`,
or the one schema in an `anyOf` or `oneOf` with only one, which means the
same as `allOf` with it. Turn it off if you compose schemas in `allOf`
because it's clearer.

A schema can be moved if the schema it's in, with its keywords in it,
means what the two mean separately. A keyword in both is combined: arrays
are joined, like `required`'s names, and objects are merged if they
don't have a name in common with a different value, like `properties`
and other maps. A keyword with the same value in both is kept once.
Whether that means the same comes from what the keywords lower to, so a
keyword moved next to one it reads, or that reads it, like
`additionalProperties` and `properties`, or `if` and `then`, isn't, and
neither is `anyOf` combined with `anyOf`. It works for custom keywords
too, including the siblings a keyword that doesn't lower declares it
reads.

A schema with an identifier, like `$id` or `$anchor` (a keyword with a
`resolve` hook), or definitions, whose URIs would change, can't be moved,
and neither can one with a keyword that reads what its siblings
evaluated, like `unevaluatedProperties`. A schema a `$ref` refers to
isn't in the schema, so it isn't reported. From 2019-09, `$ref` is a
keyword like any other, so `allOf: [{ "$ref": … }]` is reported. In
draft-04 through draft-07, a schema that's a `$ref` replaces the schema
it's in, so it's only reported if it's the only schema in `allOf` and
there's nothing but `allOf` in the schema it's in. Booleans aren't
reported.

It only looks at the schema and the schemas in it, not at what they
reference, so it doesn't matter what a `$ref` refers to. A reference into
a moved schema, like `#/allOf/0/properties/a`, would need to change too,
which this rule doesn't look for. It has no options.

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

#### A keyword that's already there with the same value

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "allOf": [{ "type": "object", "required": ["a"] }]
}
```

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

#### oneOf with one schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "oneOf": [{ "required": ["a"] }]
}
```

> This schema's keywords can be moved into the schema 'oneOf' is in

### Not reported

#### A keyword that's already there with another value

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": { "a": {}, "b": {} },
  "$ref": "#/$defs/a",
  "allOf": [{ "$ref": "#/$defs/b" }]
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
