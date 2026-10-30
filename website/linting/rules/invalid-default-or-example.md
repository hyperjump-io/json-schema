# `invalid-default-or-example`

In `recommended`, as a warning.

A `default` value or a value in `examples` that isn't valid against the
schema it's in. Tools use these as starting values or to show examples, so
an invalid one is misleading. Often it's out of date with the schema. The
specs recommend that they be valid, so this is a lint rule rather than an
error. Draft-04 doesn't say, but it's a mistake there too.

The schema is evaluated without compiling it, using `evaluatorForLint`. It
includes what the schema references, either in this document or in one
the session can find. Formats are validated according to the
configuration. A value is only reported if it fails. A value that might
be valid isn't reported. That happens when a reference that can't be
followed or a `$dynamicRef` decides the result.

A value that's valid against its own schema is also checked against the
outermost schemas that apply that schema in place, through `allOf`,
`anyOf`, `$ref`, and so on. A schema in `not` or `if` doesn't have to pass
for the schema around it to pass, so those aren't followed. References
from other documents aren't known, so they aren't followed either.

It has no options.

## Examples

### Reported

#### An invalid default

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "default": "not-an-integer"
}
```

> The 'default' value isn't valid against the schema it's in

#### Each invalid example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "examples": [42, "a", 1.5]
}
```

> This example isn't valid against the schema it's in
>
> This example isn't valid against the schema it's in

#### What the schema references counts

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "a": { "minimum": 10 }
  },
  "$ref": "#/$defs/a",
  "default": 5
}
```

> The 'default' value isn't valid against the schema it's in

### Not reported

#### A default the schemas applying it allow

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "integer",
  "allOf": [{ "minimum": 0, "default": 5 }]
}
```

#### A value that might be valid isn't reported

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$ref": "https://example.com/nope",
  "default": 5
}
```
