# Validating JSON files (`src/validate/`)

`jsonSchemaValidate({ compiled })` is a unified plugin that validates a
JSON AST from `rejsonParse` against a compiled schema. It's how the CLI
validates instances, and how other unified tools can.

- It takes a `CompiledSchema`, not a schema URI. Compiling is the caller's
  business: which session, registries, and `allowRetrieval`, and whether a
  validator is shared between files.
- It uses `validatorFor` with `input: "node"` and BASIC output and adds each error with
  `file.message`, described by `outputErrorMessage`, as an error
  (`fatal: true`). The rule ID is the keyword URI and the source is
  `json-schema`, as in the output. The tree isn't changed.
- Syntax errors are the parser's to report. Values that couldn't be parsed
  aren't evaluated, so they don't add errors of their own.
