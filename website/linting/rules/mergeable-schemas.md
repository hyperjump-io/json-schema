# `mergeable-schemas`

In `recommended`, as a warning.

A schema whose keywords can be moved into its parent schema without
changing what's valid, so wrapping it isn't needed. That applies to a
schema in `allOf`. It also applies to an `anyOf` or `oneOf` with only one
schema, which means the same as `allOf` with that schema. Turn the rule off
if you compose schemas in `allOf` because you find it clearer.

A schema can be moved if the parent, with the keywords moved into it,
means the same as the two schemas separately. A keyword that's in both is
combined:

- Arrays are joined, like the names in `required`.
- Objects are merged, like `properties` and other maps, as long as they
  don't have the same name with different values.
- A keyword with the same value in both is kept once.

Whether the result means the same comes from what the keywords lower to.
Some keywords read each other, like `additionalProperties` and
`properties`, or `if` and `then`. Moving a keyword next to one that it
reads, or that reads it, changes its meaning, so it isn't reported.
Neither is `anyOf` combined with `anyOf`. It works for custom keywords too.
That includes the siblings that a keyword that doesn't lower declares it
reads.

These can't be moved:

- A schema with an identifier, like `$id` or `$anchor` (a keyword with a
  `resolve` hook), or with definitions. Their URIs would change.
- A schema with a keyword that reads what its siblings evaluated, like
  `unevaluatedProperties`.

A schema that a `$ref` refers to isn't inside the parent schema, so it
isn't reported. From 2019-09 on, `$ref` is a keyword like any other, so
`allOf: [{ "$ref": … }]` is reported. In draft-04 through draft-07, a schema
that's a `$ref` replaces the schema it's in. So it's only reported if it's
the only schema in `allOf` and the parent has nothing but `allOf`. Booleans
aren't reported.

It only looks at the schema and the schemas inside it, not at what they
reference, so it doesn't matter what a `$ref` refers to. A reference into
a moved schema, like `#/allOf/0/properties/a`, would need to change too.
This rule doesn't look for those. It has no options.

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
