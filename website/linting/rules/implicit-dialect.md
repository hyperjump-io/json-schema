# `implicit-dialect`

In `recommended`, as a warning. Off in `openapi-3-0`.

A root schema without `$schema` whose dialect came from somewhere else.
That can be the `dialectUri` option of `jsonSchemaResolve`, such as from a
`schema` media type parameter, or the `defaultDialectUri` config. Other
tools won't know the dialect, or they'll assume a different one. So will
this tool if it's loaded differently. Every spec from draft-06 on says
`$schema` SHOULD be in the root schema. draft-04 doesn't say, but the same
problem applies.

If a root schema has no `$schema` and its dialect can't be determined, the
resolver reports an error instead.

OpenAPI 3.0 Schema Objects don't have `$schema`, so their dialect always
comes from somewhere else. That's why the rule is off in `openapi-3-0`.

The CLI has no default dialect, so it never reports this rule. In the CLI,
a `.schema.json` file without `$schema` gets that error, and a `.json`
file without one is treated as an instance. This rule is reported when
linting from code. It applies when a schema's dialect comes from a
registry entry's `dialectUri`, the `defaultDialectUri` config, or a media
type parameter.

A boolean root schema can't have `$schema`, so it isn't reported. Neither
is a draft-04–07 root with `$ref`, because the resolver doesn't give that
document a dialect. It has no options.

## Examples

### Reported

#### A dialect from the default

With `defaultDialectUri` set to `https://json-schema.org/draft/2020-12/schema`:

```json dialect=https://json-schema.org/draft/2020-12/schema
{
  "type": "string"
}
```

> The schema doesn't declare its dialect, so it's 'https://json-schema.org/draft/2020-12/schema' only because of how it was loaded. Add '"$schema": "https://json-schema.org/draft/2020-12/schema"' so other tools read it the same way.

### Not reported

#### With `$schema`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "string"
}
```

#### An embedded resource without `$schema`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "foo": { "$id": "https://example.com/foo" }
  }
}
```
