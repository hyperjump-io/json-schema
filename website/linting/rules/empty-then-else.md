# `empty-then-else`

In `recommended`, as a warning.

`then` or `else` that every value is valid against and that has no
annotations: `true`, `{}`, or a schema with nothing but `$comment`. It
never fails and adds nothing, so it's likely unfinished. A schema with
annotations, like `description`, isn't reported, because the annotations
apply only when the branch does.

Without `if`, `then-else-without-if` reports it too. It has no options.

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
