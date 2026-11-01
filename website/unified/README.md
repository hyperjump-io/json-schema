# Using unified

[unified](https://unifiedjs.com/) is a plugin-based framework for
processing text as syntax trees. It's behind tools like remark, which
processes markdown. This library has unified plugins for JSON and JSON
Schema. You can use them to build your own tools that validate and lint
JSON files and report every problem at its line and column. The
[Hyperjump CLI](https://github.com/hyperjump-io/cli/blob/main/website/README.md)
is built this way.

A pipeline starts with `rejsonParse` from `@hyperjump/browser`. It
parses JSON text into a JSON AST. It's error-tolerant. With
`accept: "recovered"`, a file is still processed if the parser could
recover from its syntax errors. A trailing comma is an example. Those
syntax errors are reported as warnings.

| Plugin | From | What it does |
| --- | --- | --- |
| `rejsonParse` | `@hyperjump/browser` | Parses JSON text into a JSON AST |
| `jsonSchemaValidate` | `@hyperjump/json-schema` | Validates the JSON against a compiled schema |
| `jsonSchemaResolve` | `@hyperjump/json-schema` | Turns the JSON AST of a schema into a schema AST and reports its problems |
| Lint rules and presets | `@hyperjump/json-schema/lint/...` | Lint a schema AST |
| `rejsonStringify` | `@hyperjump/browser` | Turns the tree back into JSON text |

Problems are added to the file as
[vfile](https://github.com/vfile/vfile) messages. Any unified reporter can
print them, such as
[`vfile-reporter`](https://github.com/vfile/vfile-reporter).

- [Validating JSON files](validating-json-files.md)
- [Linting in a pipeline](linting-in-a-pipeline.md)
- [Reporting errors](reporting-errors.md)
