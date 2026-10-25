# `empty-enum`

In `recommended`, as a warning.

An empty `enum`. No value is equal to one of its values, so the schema
fails every instance. That's what `false` is for, so an empty `enum` is
more likely values that are missing.

The specs say `enum` should have at least one value. Draft-04 says it
must, so there it's a problem with the schema, which this rule doesn't
report. It has no options.

## Examples

### Reported

#### An empty enum

```json
{ "$schema": "https://json-schema.org/v1", "enum": [] }
```

> 'enum' is empty, so nothing is valid against it

### Not reported

#### An enum with values

```json
{ "$schema": "https://json-schema.org/v1", "enum": [null] }
```

#### An empty enum is a schema problem in draft-04, not lint

```json
{ "$schema": "http://json-schema.org/draft-04/schema#", "enum": [] }
```
