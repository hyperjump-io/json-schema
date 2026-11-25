# `redundant-all-of-any-of-schemas`

In `recommended`, as a warning.

A schema in `allOf` or `anyOf` that another schema in it makes redundant.
The keyword says the same thing without it.

- In `anyOf`, it's a schema that allows nothing another one doesn't.
  Any value it allows already passes because of the other one.
- In `allOf`, it's a schema that allows everything another one does. Any
  value it rejects already fails because of the other one.

It might be a limit that was meant to be different, or schemas that were
meant to be in `oneOf`.

Schemas are compared by what they mean, as far as that's known without
trying values:

- Types, including `integer` as a kind of `number`
- Limits, like `maximum` and `minLength`
- `const` and `enum` values
- Required properties
- The schemas for properties and items, compared the same way
- References to schemas in the same document

Anything else, like `pattern`, is only known to allow what the same
keyword with the same value allows. So the rule doesn't find every
redundant schema, but the ones it reports are redundant.

Of two schemas that allow the same values, the later one is reported.
`duplicate-all-of-any-of-schemas` reports it too.

A schema that annotates, like one with a `title`, isn't reported, because
the annotation is an effect. Neither is a schema that evaluates properties
or items where `unevaluatedProperties` or `unevaluatedItems` might depend
on it. That includes the root schema and schemas in `$defs`, because
another document could reference them.

A schema that a reference refers to isn't reported either, or one with an
`$id`, an `$anchor`, or a `$dynamicAnchor`, because a reference would
break without it. The same goes for a schema that contains one of those.
It has no options.

## Examples

### Reported

#### A tighter limit in `anyOf`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "maximum": 3 }, { "maximum": 4 }]
}
```

> This schema has no effect, because 'anyOf/1' allows everything it allows

#### A looser limit in `allOf`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "maximum": 3 }, { "maximum": 4 }]
}
```

> This schema has no effect, because it allows everything 'allOf/0' allows

#### `integer` next to `number`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "type": "integer" }, { "type": "number" }]
}
```

> This schema has no effect, because 'anyOf/1' allows everything it allows

#### Known values next to their type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "enum": ["small", "large"] }, { "type": "string" }]
}
```

> This schema has no effect, because 'anyOf/1' allows everything it allows

#### A schema for items

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "array",
  "items": {
    "anyOf": [
      { "type": "string", "maxLength": 3 },
      { "type": "string" }
    ]
  }
}
```

> This schema has no effect, because 'anyOf/1' allows everything it allows

### Not reported

#### Schemas that each allow something the other doesn't

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "maximum": 3 }, { "minimum": 5 }]
}
```

#### A schema that annotates

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [
    { "title": "A known size", "enum": ["small", "large"] },
    { "type": "string" }
  ]
}
```

#### A schema that's referenced

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [
    { "type": "string" },
    { "$anchor": "short", "type": "string", "maxLength": 3 }
  ],
  "properties": {
    "code": { "$ref": "#short" }
  }
}
```

#### Keywords that aren't compared

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "pattern": "^a$" }, { "pattern": "^a" }]
}
```

#### `oneOf` isn't reported

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [{ "type": "integer" }, { "type": "number" }]
}
```
