# `additional-items-without-items-array`

In `recommended`, as a warning.

`additionalItems` without a sibling `items` that's an array of schemas.
`additionalItems` only applies to the items after the ones that array
covers. Without the array, `additionalItems` is ignored. A single schema in
`items` already applies to every item.

It's for draft-04 through 2019-09, which have `additionalItems`. It has no
options.

## Examples

### Reported

#### Items is a schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "items": { "type": "number" },
  "additionalItems": false
}
```

> 'additionalItems' has no effect when 'items' is a schema, not an array of schemas

#### Without items

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "additionalItems": false
}
```

> 'additionalItems' has no effect without 'items'

### Not reported

#### Items is an array of schemas

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "items": [{}],
  "additionalItems": false
}
```

#### A property named `additionalItems` isn't a keyword

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "properties": { "additionalItems": false }
}
```
