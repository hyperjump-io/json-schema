# `implicit-dialect`

In `recommended`, as a warning.

A root schema without `$schema` whose dialect came from somewhere else:
the `dialectUri` option of `jsonSchemaResolve`, such as a `schema` media
type parameter, or the `defaultDialectUri` config. Other tools, and this
one loaded differently, don't know the dialect, or assume a different
one. Every spec from draft-06 on says `$schema` SHOULD be in the root
schema. draft-04 doesn't say, but the same problem applies.

A root without `$schema` whose dialect can't be determined is an error
from the resolver instead. The CLI has no default dialect, so it never
reports this rule: a `.schema.json` file without `$schema` is that error,
and a `.json` file without one is an instance. It's reported when linting
from code, for a schema whose dialect is a registry entry's `dialectUri`,
the `defaultDialectUri` config, or a media type parameter. A boolean root schema can't have `$schema`, so
it isn't reported, and neither is a draft-04–07 root with `$ref`, because
the resolver doesn't give that document a dialect. It has no options.

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
