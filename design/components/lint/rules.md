# Rules

- Rules and presets are in this package, in `src/lint/`.
- A rule is made with `lintRule` from `src/lint/`, which wraps
  `unified-lint-rule`'s (see [Configuration comments](configuration-comments.md)), so its config is a severity
  (`"off"`, `"warn"`, `"error"`, or 0–2) and its own options. Its origin is
  `jsonschema-lint:<name>`. The severity has to be in an array
  (`[rule, ["error"]]`, `[rule, [2, options]]`). A bare `"error"` is taken as
  the rule's options, at the default severity, which is a warning.
- Rules are exported as `lint/rules/<name>`, the preset as
  `lint/recommended`, and the utilities as `lint`, for rules in other
  packages.
- Presets bundle rules with their settings, like remark's
  `remark-preset-lint-recommended`. A project's `.hyperjumprc` uses a
  preset and adjusts rules. The CLI loads plugins with the `hyperjump`
  prefix.
- Rules find keywords by keyword URI, never by name, so a rule works in
  every dialect with the keyword and does nothing if the keyword isn't
  loaded. A rule about a draft-specific keyword uses that keyword's URI.
  A rule about something a draft's own keyword already reports, like
  draft-04's empty `enum`, leaves that keyword's URI out.
- Utilities in `src/lint/` keep rules short: visit every schema, visit every
  keyword by URI, get a sibling keyword, and find what a reference points
  to. They know nothing about particular keywords. A rule that needs to
  know what a keyword means, like which types it applies to, reads what it
  lowers to (`lowerForLint`, and `appliesTo`, `keywordAppliesTo`,
  `canPass`, and `assertsOnItsOwn` in `analysis.js`; "Lowering
  for lint"). A rule that needs to know whether a value is valid evaluates
  the lowered schemas (`evaluatorForLint` in `evaluate.js`) instead of
  compiling.
