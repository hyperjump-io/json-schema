# Schema validation

v1 is designed to evolve compatibly, which is why it doesn't allow unknown
keywords. There's no static v1 meta-schema. What's valid depends on what the
implementation supports, including user-defined keywords, which can't change
an internal meta-schema.

- Schema validation is keyword by keyword, for every dialect. Schemas are
  never validated against a meta-schema.
- Unsupported keywords are reported by the resolver according to the
  dialect's `unknownKeywords`.
- Every problem with a schema is found while it's resolved, and a schema is
  always checked. There's no option to skip it. A trusted schema that has
  to start fast can be compiled once and restored with
  `JsonSchema.restoreValidator`, which doesn't resolve anything.
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
- A schema that wasn't retrieved from a `file:` URI can't be identified by
  one, in every dialect. Its references would be resolved as if it were a
  file, which would get around browser's rule that only files can reference
  files. v1 had the same rule for registered schemas.
- The resolver's own checks (schemas that aren't objects or booleans,
  misplaced `$schema`, duplicate ids and anchors, invalid identifiers,
  `file:` identifiers) are schema validation too.
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
