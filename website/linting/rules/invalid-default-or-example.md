# `invalid-default-or-example`

In `recommended`, as a warning.

A `default` value, or a value in `examples`, that isn't valid against the
schema it's in. Tools use them as values to start with or to show, so an
invalid one misleads, and it's often out of date with the schema. The
specs recommend that they be valid, so it's lint. Draft-04 doesn't say,
but it's a mistake there too.

The schema is evaluated without compiling it (`evaluatorForLint`), with
what it references in this document or in one the session can find, and
formats are validated as the configuration says. A value is reported only
if it fails. One that might be valid isn't, like one a reference that
can't be followed or a `$dynamicRef` decides.

A value that's valid against the schema it's in is also checked against
the outermost schemas that apply that one in place, through `allOf`,
`anyOf`, `$ref`, and so on, where it's used. A schema in `not` or `if`
doesn't have to pass for the one around it to, so those aren't followed.
Where something in another document references the schema isn't known.

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
