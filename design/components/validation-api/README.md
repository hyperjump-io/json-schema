# Validation API (`src/operations/`)

The operations are functions that take a `JsonSchema` or a session (see
[The API as functions](../api/README.md)). The evaluators behind a compiled
schema are in `src/kernel/validator.js`, which isn't exported.

- `validate`, `validator`, `annotate`, and `annotator` take a context, a
  schema (a URI or a value), and options (`src/operations/validate.js`).
  `validator` and `annotator` compile and return a function, with the
  output format, plugins, and input chosen once. `validate` and `annotate`
  compile on every call. `compile` returns an opaque `CompiledSchema`, and
  `validatorFor` and `annotatorFor` make the same functions from one, so a
  restored schema (`restore`) is used the same way (`src/operations/compile.js`).
- `validatorFor` and `annotatorFor` were the design's working name, kept
  because they say what they take. Rejected: overloading `validator` with
  a `CompiledSchema` in place of the context and schema, which makes its
  types and its first argument ambiguous.
- `validate` never builds an AST. `annotate` validates and returns the
  instance as an AST, so users never need to call both. The `input` option
  is `value`, `json` (text, with syntax errors in the output), or `node`.
  A JSON string is also a valid instance, so the form can't be detected.
  `annotate` with a node returns the node it was given, so every input has
  the same result type.
- Without `output` or `plugins`, a value goes through the fast path that
  takes no options, as `validate(instance)` did on the old `Validator`.
- A schema given as a value is added to the session in a registry of its
  own (`addSchemaValue` in `src/registry/session-registries.js`), found
  first. It's identified by a new `urn:uuid:` URI, which also identifies it
  without an `$id`. Its `$id` is looked up in the other registries when
  it's added, so one a registry also has throws, even if identical.
  Nothing is cached. A boolean has no `$schema`, so it needs
  `defaultDialectUri`, like any schema without one.
- Given a session, an operation uses it, and `registry` or
  `allowRetrieval` in its options is a `TypeError`, because the session
  already has its own and ignoring them would be silent.
- Operations take a session mainly for code that only has one: a unified
  plugin or lint rule gets the session a document was resolved in, and
  shouldn't create one, so what it validates or bundles sees the same
  registry, `allowRetrieval`, and documents (the CLI bundles a file in its
  session this way). A session also shares retrieved documents and
  dialects built from meta-schemas between calls, and keeps them on one
  version of each file. Considered 2026-10-29: only a `JsonSchema`, adding
  sessions back when something needs them. Kept, because the pipeline case
  already exists.
- FLAG output is a plain `boolean` to avoid allocating. BASIC and DETAILED are
  `{ valid, errors }`. An output format is a value (`OutputFormat<R>`)
  passed as `output`, and its type is its result's. A new output format spec is in progress and
  should be supported eventually.
- Problems that are returned are plain data, and problems that are thrown
  are `Error`s. Validation errors and syntax errors are returned, so
  they're plain objects with `source`, `ruleId`, and `place` (validation
  errors also have absolute keyword location and instance location), and
  no message. Text input adds positions. Any syntax
  error makes the instance invalid, but it's still validated as far as it
  could be parsed. Schema problems are thrown together, in a `SchemaError`,
  which is an `Error`, but each problem in it is plain data
  (`SchemaMessage`), with a message, because only the resolver or keyword
  that found it can say what's wrong. They're collected, not thrown one at
  a time, and `lint(uri)`'s results are the same type (see [Linting from code](../lint/lint-api.md)).
- Errors are converted to `VFileMessage`s where they're reported, with
  `toVFileMessage`, which gives them a generic message. A validation error
  says it fails the constraint at its absolute keyword location, which
  identifies the keyword wherever evaluation started, except that a
  `file:` one is relative to the working directory (see [Local paths in
  messages and output](../file-uris.md)). It names the instance location
  only when there's no position, because a position says where the
  instance is better. Reporting errors with unified needs
  this conversion anyway: `file.message` makes a message that belongs to
  the file, so a `VFileMessage` made elsewhere would have to be made again.
- Validation errors were `VFileMessage`s with generic messages at first.
  Creating an `Error` costs about 0.25µs even without capturing a stack
  trace, and the messages took time to build. Plain objects without
  messages made BASIC about 40% faster and DETAILED about 55% faster on the
  test suite's invalid instances.

## Known limitations

- The `JsonSchema` shortcuts (`validate(uri, ...)` and the others) compile the
  schema every time.

## Contents

- [Annotations](annotations.md)
