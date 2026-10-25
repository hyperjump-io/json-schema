# `keyword-without-type`

In `recommended`, as a warning.

A keyword that applies only to one type of value, like `properties` to
objects or `minimum` to numbers, or a format that does, like `date` to
strings, where nothing says what type the value is. Values of other types are valid, because the keyword ignores them, so
`{ "properties": { … } }` accepts `"hello"` and `42`. That's rarely what's
meant.

`type`, `const`, or `enum` in any schema that can apply to the same value
says what type it is, so `required` in an `anyOf` is fine if `type` is
next to the `anyOf`, and a schema in `$defs` is fine if what references it
has a `type`. It's reported once for each group of schemas, on the first
keyword for one type. A group that nothing in the document applies, like
a schema in `$defs` that's only used from other documents, isn't
reported, and neither is one with a reference that can't be followed, a
keyword in a `not`, where other types are already rejected, or a group
with a `propertyNames` schema, which only applies to strings.

A format's types come from its definition (`types`), so a custom format
that doesn't say, or one the dialect doesn't support, isn't reported.
A `type` that doesn't allow the keyword's type is reported by
`keyword-for-disallowed-type`. It has no options.

## Examples

### Reported

#### Properties without type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": { "a": {} },
  "required": ["a"]
}
```

> 'properties' applies only to objects, but there's no 'type', so values of other types are valid

#### Each type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "properties": {
                  "a": { "minimum": 0 },
                  "b": { "maxLength": 1 },
                  "c": { "minItems": 1 }
                }
}
```

> 'properties' applies only to objects, but there's no 'type', so values of other types are valid
>
> 'minimum' applies only to numbers, but there's no 'type', so values of other types are valid
>
> 'maxLength' applies only to strings, but there's no 'type', so values of other types are valid
>
> 'minItems' applies only to arrays, but there's no 'type', so values of other types are valid

#### Once for each group

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "anyOf": [{ "required": ["a"] }, { "required": ["b"] }],
  "properties": { "a": {}, "b": {} }
}
```

> 'required' applies only to objects, but there's no 'type', so values of other types are valid

### Not reported

#### With type

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": { "a": {} }
}
```

#### Const or enum says what type it is

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
                  "a": { "enum": ["x", "y"], "maxLength": 1 },
                  "b": { "const": 1, "minimum": 0 }
                }
}
```
