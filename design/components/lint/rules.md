# Rules

- Rules and presets are in this package, in `src/lint/`.
- A rule is made with `lintRule` from `src/lint/`, which wraps
  `unified-lint-rule`'s (see [Configuration comments](configuration-comments.md)), so its config is a severity
  (`"off"`, `"warn"`, `"error"`, or 0–2) and its own options. Its origin is
  `json-schema-lint:<name>`. The severity has to be in an array
  (`[rule, ["error"]]`, `[rule, [2, options]]`). A bare `"error"` is taken as
  the rule's options, at the default severity, which is a warning.
- Rules are exported as `lint/rules/<name>`, the preset as
  `lint/recommended`, and the utilities as `lint`, for rules in other
  packages.
- Presets bundle rules with their settings, like remark's
  `remark-preset-lint-recommended`. A project's `.hyperjumprc` uses a
  preset and adjusts rules. The CLI loads plugins with the `hyperjump`
  prefix.
- `recommended` is for JSON Schema. OpenAPI's presets, one for each
  version, are `recommended` followed by what's different, in
  [`@hyperjump/openapi`](https://github.com/hyperjump-io/openapi/blob/main/design/components/lint.md). A later entry
  for the same rule replaces the earlier one's setting, so a preset in
  another package can change one of these rules' severity, like
  `read-only-and-write-only`'s.
- A rule page says its setting in each preset that lists it ("In
  `recommended`, as a warning."), checked by `rule-pages.test.js`. A
  preset that only includes another doesn't list its rules. A preset in
  another package that changes a rule is linked from the rule's page, and
  says the setting on its own pages, because the test can't see it.
- A rule about what a schema means finds it in what its keywords lower to,
  not by keyword URI, so it works for every keyword that says the same
  thing, including user-defined ones and v1's (`requireAllExcept` counts
  as `required`). A required property is `hasProperty`, `type` is `typeIs`,
  a limit is `range` or a count, a dependency is a `cases` whose condition
  is `hasProperty`, and a value in `const` or `enum` is `equals` or
  `oneOfValues`. Messages name the keywords an operation came from
  (`cameFrom`). A schema can have more than one keyword that lowers to
  `typeIs`, like `type` and a custom keyword, and it allows the types they
  all allow (`typeIsOf`). Messages name the ones that are why, or all of
  them. A schema whose keywords allow no type together allows nothing, so
  `keyword-for-disallowed-type` doesn't report its keywords. Rejected:
  reading only the first. Rejected: rules about what a keyword means that
  match keyword URIs. They miss what a schema in an `allOf` or a `$ref`
  requires, and draft-04's limits, and each needs a table of URIs per
  dialect.
- A rule about how a keyword is written still finds it by keyword URI,
  never by name, so it works in every dialect with the keyword and does
  nothing if the keyword isn't loaded: `single-type-array`,
  `single-value-enum`, `duplicate-enum-values`, `duplicate-array-items`,
  `then-else-without-if`, `if-without-then-else`, and the rules about
  dialects, identifiers, references, and definitions. So does a rule about
  what the kernel doesn't say, like what an annotation means
  (`read-only-and-write-only`, `invalid-default-or-example`). A suggestion
  of a keyword to use instead, like `const` in `single-value-range`, is the
  dialect's own name for the keyword's URI. A rule about a draft-specific
  keyword uses that keyword's URI. A rule that would report what a rule
  for a MUST reports leaves it out, so it's reported once, at the MUST's
  severity: `keyword-allows-nothing` and `keyword-without-effect` skip the
  empty arrays `empty-array` reports, like draft-04's empty `enum`.
- `mergeable-schemas` finds schemas from what keywords lower to, so
  `anyOf` and `oneOf` with one schema are mergeable, like `allOf`. It
  decides whether a
  schema can be moved by lowering the schema it would make
  (`lowerSchemaForLint`, which is asynchronous because lowering is, and
  reads the schema as nodes because it isn't in a document) and comparing its operations with the two schemas' own. Deciding from shapes instead, that a keyword whose shape
  is a map combines if the names differ, was cheaper, but assumed every
  map's entries are independent, and it still needed `required` by URI.
  The `siblings` a keyword declares are still checked, because one that
  doesn't lower can read a sibling that lowering doesn't show.
  Lowering a schema it made is what `nodeReader` is for, and why
  `lowerKeywords` reads a schema through a `Reader`. With siblings
  checked, keywords with different names lower to what they lower to
  separately, so lowering only decides a keyword that's in both, like
  `required` split across `allOf`. Rejected: not combining a keyword
  that's in both, which would remove `nodeReader` and the `Reader`, but
  loses those findings. Lowering only the combined keyword, which is
  still a value that isn't in a document. Putting the made schema in a
  document to read it as targets, which rebuilds what `nodeReader` does.
- Rules find schemas and references with `unist-util-visit`, like
  `visit(tree, "reference", …)`, because the tree is a unist tree and a
  node's type says what it is. `visitSchemas` and `visitReferences` were
  that walk with a type, and were removed. Rejected: browser's
  `jrefFindAll` in rules. It's for a target that references are followed
  from, and it needs a session and waits. A rule has the tree, and what
  every reference finds is in `document.found` already. A schema node's
  type allows error children, from a document that didn't parse, so the
  rules that read schemas say they're a `JsonSchemaNode`, as
  `visitSchemas` did.
- A rule that looks up a schema by location, for `allowsNothing` or
  `sameExpression`, makes the map from its tree, which goes with
  `document.schemas`. Rejected: `document.schemaNodes`, which has every
  reached document's schemas too, so a boolean in another document would
  be understood but an object schema wouldn't, because it isn't in
  `document.schemas`. Seeing into other documents would take
  `document.schemaNodes` with `document.reached`, which changes what the
  rules report.
- Utilities in `src/lint/` keep rules short: visit every keyword by URI,
  get a sibling keyword, and find what a reference points to. They know
  nothing about particular keywords. A rule that needs to
  know what a keyword means reads what it lowers to
  (`LintDocument.schemas`; "Lowering for lint"): which types it applies to and can pass, its
  operations, its `typeIs`, and what applies to a property (`analysis.js`),
  its limits (`bounds.js`), the properties every valid object has
  (`required-properties.js`), what it does (`effect.js`), whether a
  schema allows nothing (`allows-nothing.js`), whether two schemas
  mean the same (`same-schema.js`), and which schemas of an `allOf`,
  `anyOf`, or `oneOf` allow nothing another one doesn't
  (`redundant-schemas.js`). A rule that needs to know
  whether a value is valid evaluates the lowered schemas
  (`evaluatorForLint` in `evaluate.js`) instead of compiling.
- A rule's messages are in document order. `lintRule` sorts each rule's
  messages by where they start when it finishes, after removing the ones
  configuration comments turn off. Rules that work from what keywords
  lower to find things in the order of the operations, like upper limits
  before lower ones, and sorting in each rule would mean every rule had to
  remember to. The sort is stable, so messages in the same place stay in
  the order they were found. Messages from different rules aren't merged
  into one order; a reporter can do that.
- A rule reports everything it finds, even what another rule reports too,
  like `unevaluatedProperties: true` next to `additionalProperties: false`,
  which `empty-catch-all-schema` and `unevaluated-without-effect` both
  report. Otherwise, turning one rule off would hide what the other finds.
  A rule leaves something out only so that another rule's own configuration
  works: `keyword-implied-by-const-or-enum` doesn't check `type`, so
  `type-implied-by-const-or-enum` can be turned off on its own, and
  `keyword-without-effect` doesn't report unknown keywords, so
  `unknown-keyword`'s `ignore` option works.
