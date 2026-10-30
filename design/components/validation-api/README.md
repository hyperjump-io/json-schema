# Validation API (`src/json-schema.d.ts`)

Implemented in `src/kernel/validator.js`.

- `compile(uri)` returns a `Validator` with `validate`, `validateJson`,
  `annotate`, and `annotateJson`. `JsonSchema` has the same four as
  convenience methods that take a URI.
- `validate` never builds an AST. `annotate` validates and returns the
  instance as an AST, so users never need to call both. Each has a `Json`
  variant for text, which includes syntax errors with the validation errors.
  A JSON string is also a valid instance, so the variants can't share a
  function.
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
