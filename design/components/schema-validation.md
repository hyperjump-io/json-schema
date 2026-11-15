# Schema validation

v1 is designed to evolve compatibly, which is why it doesn't allow unknown
keywords. There's no static v1 meta-schema. What's valid depends on what the
implementation supports, including user-defined keywords, which can't change
an internal meta-schema.

- Schema validation is keyword by keyword, for every dialect. Schemas are
  never validated against a meta-schema.
- Unsupported keywords are reported by the resolver according to the
  dialect's `unknownKeywords`.
- The resolver is a plain function, `resolveSchema(tree, options)`
  (`src/schema/resolve.js`), that returns the schema AST and every problem
  as a `SchemaMessage`. `jsonSchemaResolve` is a unified plugin over it,
  the way browser's `rejsonParse` is over `fromJson`: its base URI is the
  document's URL, which the parser gives it from the file's path or its
  `url` option, adds each problem to the file as a fatal message,
  and puts the session on `file.data`. A retrieved or registry schema is
  parsed with `fromJson`, accepting what it recovered from, and resolved
  with `resolveSchema`, by `resolveSchemaText`
  (`src/schema/resolve-text.js`), so code that only loads schemas loads
  neither `unified` nor `vfile` (see
  [Bundle size](../benchmarks/bundle-size.md)). Before 2026-10-30, the
  resolver was the plugin's transformer and reported on a `VFile`, rolling
  the file's messages back while it tried a shape's alternatives, and
  `resolveSchemaText` called the transformer and `rejsonParse`'s parser
  with a fake processor. A keyword's `check` and `resolve` report with
  `context.message`, which returns nothing, so keywords don't depend on
  vfile either.
- Its one asynchronous step is finding a dialect (`getDialect`), which can
  retrieve a meta-schema. Resolving in rounds, like compiling (see
  [Compile and evaluate](kernel/README.md)), was considered on
  2026-10-30, so the resolver could take dialects instead of the session,
  and rejected: a schema's dialect decides which of its properties are
  keywords and where its subschemas are, so a round can't get past a
  dialect it doesn't have, and rounds would add machinery to remove one
  `await`. Dialects are few, and a session finds each once.
- Every problem with a schema is found while it's resolved, and a schema is
  always checked. There's no option to skip it. A trusted schema that has
  to start fast can be compiled once and restored with
  `restore`, which doesn't resolve anything.
- The shape describes a keyword's structure, and the resolver reports a
  value that doesn't fit it (see [Keywords](../specs/keyword/README.md)).
- A keyword's `check` reports everything else about its value. It's code,
  not a schema. Keyword schemas were tried first, but almost all of them
  said "a non-negative integer" or "a string", and they needed an internal
  registry, a validator for each keyword, and v1 in every `JsonSchema`,
  because they were written in v1. Their errors were generic BASIC errors.
  A check's messages are specific ("Expected a non-negative integer") and
  placed on the exact value that's wrong.
- A check runs right after its keyword's value is annotated, so it can see
  which parts of the value are schemas. That's how `itemPattern`'s check
  only looks at what isn't a schema or a group. It isn't called for a value
  that couldn't be parsed, or for keywords a reference ignores.
- The checks keywords share, like `nonNegativeInteger` and `uniqueStrings`,
  are in `src/keywords/checks.js`. They aren't exported.
- `$schema` has no check. The resolver reads it to find the dialect and
  reports what's wrong with it then.
- Dialect schemas (meta-schemas) are for dev-time tooling, not validators.
  There's no generated "what this implementation supports" meta-schema.
- A schema can't be identified by a `file:` URI, in every dialect,
  including a relative `$id` that resolves against a file. A file is where
  a schema is, not what it is: the identifier wouldn't be the same on
  another machine, and in a schema that wasn't retrieved from a file, its
  references would be resolved as if it were one, which would get around
  browser's rule that only files can reference files. A relative `$id` in a
  file needs an ancestor with an absolute identifier that isn't a file.
  Before 2026-10-27, only a schema that wasn't retrieved from a file was
  refused. v1 had that rule for registered schemas. The message quotes the
  `$id` as it's written, and so do the messages about references and
  `$schema`.
- A reference can't be written as a `file:` URI, in every dialect. It names
  a file on one machine, so it doesn't find the same schema anywhere else,
  and in a bundle it would still name the file instead of the schema
  embedded from it. A file references another with a relative reference,
  which resolves against the file. A reference written that way is
  reported and has no URI. In draft-04–07, a `$ref` like that doesn't
  replace the schema. An embedded resource with an identifier that isn't a
  file can't reference the file it's in, so the file needs an identifier
  too.
- `$schema` can't be a `file:` URI either, for the same reason: the dialect
  wouldn't be the same on another machine. A meta-schema in a file is found
  by its `$id`, which can't be a file, from a registry, like the CLI's
  workspace registry. The schema has no dialect then, like one whose
  dialect can't be found. Before 2026-10-27, a meta-schema could be found
  by its path. The JSON-or-schema media type reads a `.json` file whose
  `$schema` is a file as JSON without retrieving it, because that's an
  instance naming its schema, like `"$schema": "./schema.json"`.
- The resolver's own checks (schemas that aren't objects or booleans,
  misplaced `$schema`, duplicate ids and anchors, invalid identifiers,
  `file:` identifiers, references, and dialects) are schema validation too.
  Every problem is a
  `VFileMessage` with `source: "json-schema"`, a `ruleId`, and `fatal: true`,
  because a schema with a problem can't be used. It's an error that isn't
  thrown, as a lint rule configured as an error is in unified, so the rest of
  the document is still checked, and every problem is thrown at once, in a
  `SchemaError`. Messages from a
  keyword's shape, `check`, or `resolve` hook use the keyword's URI as the
  `ruleId`.

## Open questions

- **Where the resolver could be more tolerant.** Recoverable input should
  be accepted and reported by the linter (see [Validity and lint](lint/validity.md)). Review
  the resolver for places it's stricter than it needs to be. For
  references: anything a reference targets could be accepted as a schema,
  even inside an unknown keyword, like `definitions` in 2020-12 or `$defs`
  in draft-07, and a lint rule would report a reference to a location that
  isn't a known schema. `reference-without-target` and
  `misnamed-definitions` report these as missing schemas today. Another
  case: in draft-04–07, `{ "$ref": "#/definitions/root", "definitions":
  {…} }` fails, because everything next to `$ref` is ignored, though tools
  like typescript-json-schema generate it and other validators accept it.
