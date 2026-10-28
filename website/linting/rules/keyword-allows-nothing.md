# `keyword-allows-nothing`

In `recommended`, as a warning.

A keyword that nothing is valid against, so the schema it's in fails
every instance. That's what `false` is for, so it's more likely
something that's missing or a mistake: an empty `enum` or `type`, or
`allOf` with a schema that allows nothing, like `false` or
`{ "type": "string", "const": 1 }`, or `anyOf` whose every schema does.
It's found from what the keyword lowers to, so custom keywords are
covered too.

Only the schemas in the keyword's own value are followed, so a `$ref` to
a schema that allows nothing, which is often on purpose, isn't reported.
Neither is a keyword that only rejects some properties or items, like
`items: false` or `additionalProperties: false`, or `not: {}`, a common
way to say "nothing" on purpose. The specs say `enum` should have at
least one value. Draft-04 says it must, and v1 doesn't allow an empty
`type`, so there they're problems with the schema, which this rule
doesn't report. It has no options.

## Examples

### Reported

#### An empty enum

```json
{ "$schema": "https://json-schema.org/v1", "enum": [] }
```

> 'enum' is empty, so nothing is valid against it

#### An empty type

```json
{ "$schema": "https://json-schema.org/draft/2020-12/schema", "type": [] }
```

> 'type' is empty, so nothing is valid against it

#### allOf with a schema that allows nothing

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "allOf": [{ "type": "string" }, false]
}
```

> 'allOf' allows nothing, so nothing is valid against it

### Not reported

#### An enum with values

```json
{ "$schema": "https://json-schema.org/v1", "enum": [null] }
```

#### An empty enum is a schema problem in draft-04, not lint

```json
{ "$schema": "http://json-schema.org/draft-04/schema#", "enum": [] }
```

#### A reference to a schema that allows nothing

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "#/$defs/never",
  "$defs": { "never": false }
}
```
