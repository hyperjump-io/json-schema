# Linting schemas

Lint rules find things that are likely mistakes in a schema that still works,
such as `then` without `if`. Run them with the
[`hjlint`](https://github.com/hyperjump-io/hjlint) CLI, whose README says how
to configure them, or from code (see [Linting in a pipeline](../unified/linting-in-a-pipeline.md)).
The recommended preset, `@hyperjump/json-schema/lint/recommended`
(`hjlint/recommended` in `hjlint`), turns on every rule that's likely a
mistake. They're warnings, except for ones that find a schema that can't be
compiled, like a `$ref` that doesn't find a schema, or one the spec doesn't
allow, like a v1 `$schema` with a fragment, which are errors.

- [Rules](rules/README.md): every rule, with examples
- [Configuration comments](configuration-comments.md): turning rules off in a schema
- [Linting from code](from-code.md)
- [Linting in a pipeline](../unified/linting-in-a-pipeline.md)
- [Writing lint rules](../extending/lint-rules.md)
