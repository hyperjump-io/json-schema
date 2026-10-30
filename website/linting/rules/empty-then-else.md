# `empty-then-else`

In `recommended`, as a warning.

`then` or `else` that every value is valid against and that does nothing
else. It has no annotations and doesn't mark anything as evaluated.
Examples are `true`, `{}`, a schema with nothing but `$comment`, or a
schema whose keywords do nothing, like `properties: {}`. A reference to
such a schema counts too. The branch never fails and adds nothing, so
it's probably unfinished. A schema with annotations, like `description`,
isn't reported, because the annotations only apply when that branch
does.

The same goes for any schema that's applied when a condition passes or
when none does. That covers v1's `conditional` and `dependentSchemas`.
Those are reported as "this schema". Without `if`, `then` and `else` aren't
branches, and `then-else-without-if` reports them. It has no options.

## Examples

### Reported

#### An empty then

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": { "required": ["a"] },
  "then": {}
}
```

> 'then' has no effect, because every value is valid against it

#### An empty else, true, or only a comment

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true,
  "then": true,
  "else": { "$comment": "todo" }
}
```

> 'then' has no effect, because every value is valid against it
>
> 'else' has no effect, because every value is valid against it

#### In a subschema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "items": { "if": true, "else": {} }
}
```

> 'else' has no effect, because every value is valid against it

#### A reference to an empty schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": { "required": ["a"] },
  "then": { "$ref": "#/$defs/a" },
  "$defs": { "a": {} }
}
```

> 'then' has no effect, because every value is valid against it

#### An empty dependent schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "dependentSchemas": { "a": {}, "b": { "required": ["c"] } }
}
```

> This schema has no effect, because every value is valid against it

### Not reported

#### Annotations aren't empty

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true,
  "then": { "description": "an a" }
}
```

#### False isn't empty

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "if": true,
  "then": false
}
```
