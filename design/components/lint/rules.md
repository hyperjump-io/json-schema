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
  `keyword-for-disallowed-type` doesn't report its keywords. Until
  2026-10-28, rules read only the first. Before 2026-10-28, about half the rules matched keyword
  URIs. They missed what a schema in an `allOf` or a `$ref` requires, and
  draft-04's limits, and each needed a table of URIs per dialect.
- A rule about how a keyword is written still finds it by keyword URI,
  never by name, so it works in every dialect with the keyword and does
  nothing if the keyword isn't loaded: `single-type-array`,
  `single-value-enum`, `duplicate-enum-values`,
  `then-else-without-if`, `if-without-then-else`, and the rules about
  dialects, identifiers, references, and definitions. So does a rule about
  what the kernel doesn't say, like what an annotation means
  (`read-only-and-write-only`, `invalid-default-or-example`). A suggestion
  of a keyword to use instead, like `const` in `single-value-range`, is the
  dialect's own name for the keyword's URI. A rule about a draft-specific
  keyword uses that keyword's URI. A rule about something a draft's own
  keyword already reports, like draft-04's empty `enum`, leaves that
  keyword's URI out.
- `mergeable-schemas` was `mergeable-all-of-schema` until 2026-10-28, when
  it started finding schemas from what keywords lower to, which made
  `anyOf` and `oneOf` with one schema mergeable too. It decides whether a
  schema can be moved by lowering the schema it would make
  (`lowerSchemaForLint`) and comparing its operations with the two
  schemas' own. Deciding from shapes instead, that a keyword whose shape
  is a map combines if the names differ, was cheaper, but assumed every
  map's entries are independent, and it still needed `required` by URI.
  The `siblings` a keyword declares are still checked, because one that
  doesn't lower can read a sibling that lowering doesn't show.
- Utilities in `src/lint/` keep rules short: visit every schema, visit every
  keyword by URI, get a sibling keyword, and find what a reference points
  to. They know nothing about particular keywords. A rule that needs to
  know what a keyword means reads what it lowers to (`lowerForLint`;
  "Lowering for lint"): which types it applies to and can pass, its
  operations, its `typeIs`, and what applies to a property (`analysis.js`),
  its limits (`bounds.js`), the properties every valid object has
  (`required-properties.js`), what it does (`effect.js`), whether a
  schema allows nothing (`allows-nothing.js`), and whether two schemas
  mean the same (`same-schema.js`). A rule that needs to know
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
