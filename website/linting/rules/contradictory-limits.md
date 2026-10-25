# `contradictory-limits`

In `recommended`, as a warning.

A lower limit above its upper limit, so no value of the type they limit
is valid. Values of other types still are, so the schema doesn't fail
everything, but it's rarely what's meant.

- Numbers: the tightest of `minimum` and `exclusiveMinimum` against the
  tightest of `maximum` and `exclusiveMaximum`, in draft-04's form, where
  `exclusiveMinimum` and `exclusiveMaximum` are booleans, and later ones,
  where they're numbers. Equal limits are reported if either is
  exclusive.
- Strings, arrays, and objects: `minLength` and `maxLength`, `minItems`
  and `maxItems`, and `minProperties` and `maxProperties`.
- More required properties than `maxProperties` allows. They're the
  distinct properties that `required`, or any keyword that requires
  properties (v1's `requireAllExcept`), requires, with what
  `dependentRequired` and `dependencies` add for those properties, and
  what schemas that have to pass (`allOf`, `$ref`, and dependent schemas)
  require. There's a message on `maxProperties` and on each keyword in
  the schema that requires some of them, which names the others.
- `minContains` and `maxContains`, if there's a `contains`. Without one,
  they have no effect, which `min-max-contains-without-contains`
  reports.

Otherwise, it only compares limits in the same schema. It has no options.

## Examples

### Reported

#### Minimum greater than maximum

```json
{ "$schema": "https://json-schema.org/v1", "minimum": 10, "maximum": 5 }
```

> 'minimum' is greater than 'maximum', so no number is valid

#### Equal limits where one is exclusive

```json
{
  "$schema": "https://json-schema.org/v1",
  "exclusiveMinimum": 5,
  "maximum": 5
}
```

> 'exclusiveMinimum' is equal to 'maximum', so no number is valid

#### Exclusive limits

```json
{
  "$schema": "https://json-schema.org/v1",
  "exclusiveMinimum": 100,
  "exclusiveMaximum": 50
}
```

> 'exclusiveMinimum' is greater than 'exclusiveMaximum', so no number is valid

### Not reported

#### Equal inclusive limits allow one number

```json
{ "$schema": "https://json-schema.org/v1", "minimum": 5, "maximum": 5 }
```

#### The tightest limits are compared

```json
{
  "$schema": "https://json-schema.org/v1",
  "minimum": 1,
  "exclusiveMinimum": 0,
  "maximum": 6
}
```
