# Validity and lint

| | Validity | Lint |
| --- | --- | --- |
| Question | Can the schema be used? | Is the schema likely wrong, or badly written? |
| Where | `shape`, `check`, and `resolve` hooks, while resolving | unified plugins that run after resolving, on the schema AST |
| Configurable | No. The dialect and keywords define it | On or off, `warn` or `error`, and options |
| Default | Always on, always errors | Off, unless a preset turns it on |

- What a spec says a keyword's value MUST be is validity, and what it says
  it SHOULD be is lint, unless the implementation recovers from it (see
  below). The spec's text decides, not its meta-schema, as v1 says. The
  draft meta-schemas don't allow an empty `type` array, an empty `enum` in
  draft-06 and draft-07, or an empty array `items` in 2019-09, but the
  drafts' text does, so they're lint, as warnings. An empty `enum` is
  `empty-array`, an error, in draft-04 (MUST), and `keyword-allows-nothing`,
  a warning, after it (SHOULD).
- A keyword with no effect (`then` without `if`, `minContains` without
  `contains`), a reference to something missing, and an unknown `format`
  that's only an annotation are lint. The schema still works.
- An unsupported `format` when formats are validated is validity, because
  the schema can't be compiled. The `format` keyword's `check` reports it,
  in every schema in the document, so it's a `SchemaError` with a place,
  not an error from lowering. Its context has the dialect for that.
- A MUST the implementation recovers from is lint, at `error` in
  `recommended`, rather than validity. Being tolerant of bad input is
  better than refusing a schema that can be understood. A v1 `$schema`
  with a fragment, or that isn't normalized, still finds v1, so it's
  `invalid-dialect-uri`. `$schema` or `$vocabulary` where a schema
  resource doesn't start is ignored, so it's `misplaced-dialect` or
  `misplaced-vocabulary`. Those rules follow each draft's text, which is
  stricter than the resolver: draft-04–07 only allow `$schema` at the
  document's root, and `$vocabulary` belongs at a meta-schema document's
  root, but the resolver uses them at the root of an embedded resource.
  A duplicate in an array the specs say must be unique, like `required`
  or `type`, changes nothing, so it's `duplicate-array-items`. An empty
  array the specs say can't be empty, like `allOf` or `anyOf`, has no
  effect or allows nothing, so it's `empty-array`, and draft-04's
  `exclusiveMaximum` without `maximum` has no effect, so it's
  `exclusive-limit-without-limit`. Each has one meaning, so refusing it
  helps no one. `keyword-allows-nothing` and `keyword-without-effect`
  skip what `empty-array` reports (`src/lint/empty-arrays.js`), so it's
  reported once, as an error. The resolver still ignores what it
  ignored, and reads the schema the same way, so only the report moved.
- `check` stays for validity only. Its context has the schema the keyword
  is in, for requirements on siblings, like draft-04's `exclusiveMaximum`
  needing `maximum`, but not other schemas or warnings. Rules read the
  resolved AST instead. Every keyword in a schema is identified before any
  is checked, so a check finds siblings that come after it.
