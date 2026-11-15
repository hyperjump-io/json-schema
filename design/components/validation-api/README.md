# Validation API (`src/operations/`)

The operations are functions that take a config (see
[The API as functions](../api/README.md)). The evaluators behind a compiled
schema are in `src/kernel/validator.js`, which isn't exported.

- `validate`, `validator`, `annotate`, and `annotator` take a config, a
  schema (a URI or a value), and options (`src/operations/validate.js`).
  `validator` and `annotator` compile and return a function, with the
  output format, plugins, and input chosen once. `validate` and `annotate`
  compile on every call. `compile` returns an opaque `CompiledSchema`, and
  `validatorFor` and `annotatorFor` make the same functions from one, so a
  restored schema (`restore`) is used the same way (`src/operations/compile.js`).
- `validatorFor` and `annotatorFor` were the design's working name, kept
  because they say what they take. Rejected: overloading `validator` with
  a `CompiledSchema` in place of the config and schema, which makes its
  types and its first argument ambiguous.
- `validate` never builds an AST. `annotate` validates and returns the
  instance as an AST, so users never need to call both. The `input` option
  is `value`, `json` (text, with syntax errors in the output), or `node`.
  A JSON string is also a valid instance, so the form can't be detected.
  `annotate` with a node returns the node it was given, so every input has
  the same result type.
- Without `output` or `plugins`, a value goes through the fast path that
  takes no options, as `validate(instance)` did on the old `Validator`.
- The instrumented evaluator (`src/kernel/instrumented.js`) isn't imported
  by the validator. `validator` and `annotator` load it with `import()`
  when the options need it (output, plugins, annotating, or an input other
  than a value) and pass it to each evaluation that needs it, so code that
  only validates values with FLAG never loads it. Before 2026-10-30, it
  was set on the compiled schema (`useInstrumented`), which every
  operation shares, so an evaluation before it was set threw. `validatorFor`
  and `annotatorFor` are synchronous, so they import it, in a module of
  their own (`src/operations/validate-compiled.js`). The package is
  `"sideEffects": false`, or bundlers keep every re-exported module (see
  [Bundle size](../../benchmarks/bundle-size.md)).
- A schema given as a value is added to the call's registry before its
  session is made (`callSession`), so the session's registry never
  changes. It's found by a new `urn:uuid:` URI, which also identifies it
  without an `$id`. Its `$id` is looked up when it's added, so one another
  schema in the registry also has throws, even if identical. Nothing is
  cached. A boolean has no `$schema`, so it needs `defaultDialectUri`, like
  any schema without one.
- Each call has a session of its own, made from the config and the
  call's `registry` and `allowRetrieval` (`src/operations/call-session.js`). Decided 2026-11-14. Before, an
  operation also took a session (`Context`), so operations could share
  what it retrieved, and `registry` or `allowRetrieval` in its options was
  a `TypeError`, because the session already had its own. That was two
  ways to do the same thing, and sharing a session past one unit of work
  is a mistake: its documents go stale and it keeps everything it
  resolved. Sessions are for browsing and pipelines (see
  [Sessions](../sessions/README.md)). The CLI, the only code that gave an
  operation a session, bundled a file in the session it was resolved in;
  now its bundle reads the documents the file references again. Resolving
  a file never put its tree in the session, so the file itself was read
  again either way. Rejected: operations taking only a session, which
  makes session lifetime every user's problem, even for one validation.
  Considered 2026-10-29 and kept then, for the pipeline case.
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

## Rejected

- Instances in three forms as separate functions (`validateJson`,
  `jsonValidator`, …), twelve names, or as methods on the returned
  function (`check.json(text)`), which leaves the one-off calls without the
  other forms. Splitting them would save little in a bundle, because the
  JSON parser is loaded to read schemas anyway.
- Output formats registered by name on the instance, as before 2026-10-29.
  Every registered format stayed in a bundle, and a custom one needed
  declaration merging for its type.
- For a schema given as a value without an `$id`: a counter
  (`urn:hyperjump:anonymous-1`), which is easier to read but repeats
  between processes; one fixed URN, which can't tell two schemas apart;
  and requiring an `$id`, which makes the simple path longer.
- For a value whose `$id` a registry also has: allowing identical ones,
  as a session does (see [Schema AST](../../specs/schema-ast.md)), and the
  value replacing the registry's schema, which is the override the session
  rule prevents.
- Caching compiled values: by the object, which a caller can change
  afterward (the reason a registry stringifies values, see
  [Registries](../registries/README.md)), or by JSON text, which costs a
  stringify on every call. Any cache would also have to be keyed by the
  registry, because the same schema's references can find different
  schemas with a different one.
- `compile`, `bundle`, and `lint` as methods of a session too. There's one
  way to do each operation, and a session is a value, with what's about
  documents and dialects as functions of it (`get`, `getDocument`,
  `getDialect`, `annotation`).

## Known limitations

- The shortcuts (`validate(config, uri, ...)` and the others) compile the
  schema every time.

## Contents

- [Annotations](annotations.md)
