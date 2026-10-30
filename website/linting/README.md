# Linting schemas

A schema can be valid and still not mean what its author meant. `then`
without `if` does nothing. A `required` property that's misspelled is never
checked. A `minimum` above the `maximum` means nothing is valid. JSON Schema
allows all of these, so validation can't tell you about them. Lint rules
can.

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "required": ["nmae"]
}
```

```text
7:16-7:22 warning 'nmae' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed  required-property-not-defined  json-schema-lint
```

Every rule has a page that explains what it reports, why it matters, and
how to fix it. Each page has examples. Messages link to these pages.

## Running the linter

- **From the command line** with
  [Hyperjump CLI](https://github.com/hyperjump-io/cli/blob/main/website/README.md).
  It lints every schema in your project and also validates your JSON files
  against their schemas. This is what most projects want, whether in an
  editor workflow or in CI.
- **From code** with [`lint`](from-code.md). It returns the problems as
  data. Use it in a tool of your own or to lint schemas your users give
  you.
- **In a [unified](https://unifiedjs.com/) pipeline** with
  [`jsonSchemaResolve`](../unified/linting-in-a-pipeline.md) and the rules
  as plugins.

All three use the same rules and the same configuration.

## Errors and warnings

Most rules in the recommended preset are warnings. A few are errors. Those
find schemas that can't be compiled or that the spec doesn't allow, like a
`$ref` that doesn't find a schema.

Problems that make a schema invalid, like a `minLength` of `-1`, aren't lint
rules. They're always errors and can't be turned off.

## In this section

- [Rules](rules/README.md): every rule with examples
- [Choosing rules](choosing-rules.md): the recommended preset, severities,
  and options
- [Configuration comments](configuration-comments.md): turning rules off in
  a schema
- [Linting from code](from-code.md)
- [Writing lint rules](../extending/lint-rules.md)
