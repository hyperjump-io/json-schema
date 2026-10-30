# `contradictory-limits`

In `recommended`, as a warning.

A lower limit above its upper limit. No value of the type they limit is
valid. Values of other types still are, so the schema doesn't reject
everything, but it's rarely what's meant.

It checks these limits:

- **Numbers.** The tightest of `minimum` and `exclusiveMinimum` against
  the tightest of `maximum` and `exclusiveMaximum`. This works both in
  draft-04, where `exclusiveMinimum` and `exclusiveMaximum` are booleans,
  and in later drafts, where they're numbers. Equal limits are reported if
  either one is exclusive.
- **Strings, arrays, and objects.** `minLength` and `maxLength`,
  `minItems` and `maxItems`, and `minProperties` and `maxProperties`.
- **More required properties than `maxProperties` allows.** It counts the
  distinct properties that are required. That includes properties from
  `required` and from any other keyword that requires properties, like
  v1's `requireAllExcept`. It adds what `dependentRequired` and
  `dependencies` require for those properties. It also adds what schemas
  that have to pass require, such as `allOf`, `$ref`, and dependent
  schemas. There's a message on `maxProperties`. There's also one on each
  keyword in the schema that requires some of the properties, and it names
  the others.
- **`minContains` and `maxContains`** when there's a `contains`. Without
  `contains` they have no effect, which
  `min-max-contains-without-contains` reports.

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
