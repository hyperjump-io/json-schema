# Hyperjump - JSON Schema

A JSON Schema validator and linter for JavaScript, for Node.js and browsers.

- **Every dialect.** JSON Schema v1, 2020-12, 2019-09, draft-07, draft-06,
  and draft-04, in any combination. A schema can reference a schema in
  another dialect.
- **Errors you can point to.** Validate JSON text, and every error, including
  a syntax error, comes with its line and column.
- **Schemas checked before they're used.** An invalid schema is reported
  with every problem in it, not only the first.
- **A linter.** Lint rules find schemas that work but probably don't mean
  what their author meant, like `then` without `if` or a misspelled
  `required` property.
- **Annotations.** Get the `title`, `description`, `default`, and other
  annotations that apply to each part of a value.
- **Extensible.** Add keywords, formats, dialects, output formats, and lint
  rules.
- **Safe with untrusted schemas.** A schema can't make your application
  retrieve whatever it references.

```javascript
import { JsonSchema, SchemaRegistry } from "@hyperjump/json-schema";
import { addV1 } from "@hyperjump/json-schema/v1";

const jsonSchema = new JsonSchema();
addV1(jsonSchema);
jsonSchema.addRegistry(new SchemaRegistry().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"]
}));

const validator = await jsonSchema.compile("https://example.com/person");
validator.validate({ name: "Jason" }); // true
```

Using version 1.x? Its docs are in the
[1.x README](https://github.com/hyperjump-io/json-schema/tree/v1#readme).

## Where to start

- New to the library? [Getting started](getting-started.md) takes you from
  installing it to validating, reporting errors, and linting.
- Want to check schemas and JSON files from the command line or in CI? Use
  [hjlint](https://github.com/hyperjump-io/hjlint/blob/main/website/README.md).
- Looking for a lint rule? Every rule has a page in
  [Rules](linting/rules/README.md).

## Contents

- [Getting started](getting-started.md): install, validate, report errors,
  and lint, step by step
- Guides
  - [Loading schemas](guides/loading-schemas.md): registries, files, and
    HTTP
  - [Dialects](guides/dialects.md): which versions of JSON Schema to support
  - [Validating](guides/validating.md): JavaScript values, JSON text, and
    JSON ASTs
  - [Output and errors](guides/output.md): finding out why a value is
    invalid
  - [Annotations](guides/annotations.md): `title`, `default`, and the other
    values a schema attaches to an instance
  - [Formats](guides/formats.md): when `format` validates, and which formats
    there are
  - [Invalid schemas](guides/invalid-schemas.md): what happens when a schema
    has a mistake
  - [Controlling retrieval](guides/retrieval.md): what a schema can make
    your application retrieve, and sending credentials
  - [Bundling](guides/bundling.md): a schema and everything it references,
    in one document
  - [Caching compiled schemas](guides/caching.md): skipping compilation when
    your application starts
  - [Schemas in TypeScript](guides/typescript.md): checking schemas as
    you write them
  - [Configuration](guides/configuration.md): every option, in one place
- [Linting schemas](linting/README.md)
  - [Rules](linting/rules/README.md): every rule, with examples
  - [Choosing rules](linting/choosing-rules.md): presets, severities, and
    options
  - [Configuration comments](linting/configuration-comments.md): turning
    rules off in a schema
  - [Linting from code](linting/from-code.md)
- [Using unified](unified/README.md)
  - [Validating JSON files](unified/validating-json-files.md)
  - [Linting in a pipeline](unified/linting-in-a-pipeline.md)
  - [Reporting errors](unified/reporting-errors.md)
- [Extending](extending/README.md)
  - [Custom keywords](extending/keywords.md)
  - [Custom formats](extending/formats.md)
  - [Custom dialects](extending/dialects.md)
  - [Custom output formats](extending/output-formats.md)
  - [Lint rules](extending/lint-rules.md)
  - [Evaluation plugins](extending/plugins.md)
  - [Sessions](extending/sessions.md)
