# Using unified

[unified](https://unifiedjs.com/) is a framework for processing text as
syntax trees, with plugins. It's behind tools like remark, for markdown.
This library has unified plugins for JSON and JSON Schema, so you can build
your own tools that validate and lint JSON files, with every problem
reported at its line and column. The
[hjlint](https://github.com/hyperjump-io/hjlint/blob/main/website/README.md)
CLI is built this way.

A pipeline starts with `rejsonParse` from `@hyperjump/browser/json`, which
parses JSON text into a JSON AST. It's error-tolerant: with
`accept: "recovered"`, a file with syntax errors the parser could recover
from, like a trailing comma, is still processed, and the syntax errors are
reported as warnings.

| Plugin | From | What it does |
| --- | --- | --- |
| `rejsonParse` | `@hyperjump/browser/json` | Parses JSON text into a JSON AST |
| `jsonSchemaValidate` | `@hyperjump/json-schema` | Validates the JSON against a compiled schema |
| `jsonSchemaResolve` | `@hyperjump/json-schema` | Turns the JSON AST of a schema into a schema AST, and reports its problems |
| Lint rules and presets | `@hyperjump/json-schema/lint/...` | Lint a schema AST |
| `rejsonStringify` | `@hyperjump/browser/json` | Turns the tree back into JSON text |

Problems are added to the file as
[vfile](https://github.com/vfile/vfile) messages, so any unified reporter,
like [`vfile-reporter`](https://github.com/vfile/vfile-reporter), can print
them.

- [Validating JSON files](validating-json-files.md)
- [Linting in a pipeline](linting-in-a-pipeline.md)
- [Reporting errors](reporting-errors.md)
