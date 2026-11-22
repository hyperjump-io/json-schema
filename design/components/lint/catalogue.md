# The rule catalogue

Rules were ported, one at a time, from the linter-agnostic catalogue
at https://github.com/Karan-Palan/json-schema-lint-rules (`rules/*.json`).
It's a list of candidates, not a spec. All 77 of its rules are handled:
ported, merged into another rule, or not ported for a reason below.

- Catalogue rules that differ only by keyword are one rule here:
  `then_without_if` and `else_without_if` are `then-else-without-if`, and
  `min_contains_without_contains` and `max_contains_without_contains` are
  `min-max-contains-without-contains`. `unresolved_ref_pointer` is
  `reference-without-target`.
- One that's dialect-specific in the catalogue, like the `_draft` and
  `_modern` pairs, is one rule here if keyword URIs make it work everywhere.
- Rule IDs are kebab-case and say what's found (`if-without-then-else`),
  not what to do.
- Something a spec says a keyword's value MUST be is validity, unless the
  implementation recovers from it, which makes it lint, at `error` (see
  [Validity and lint](validity.md)). Check what each draft says, because
  some changed: draft-04's `enum` MUST have values, and later drafts'
  SHOULD, so an empty `enum` is `empty-array`, an error, in draft-04, and
  `keyword-allows-nothing`, a warning, after it.
  `duplicate_required_values` is `duplicate-array-items`, which also
  reports duplicates in `type`, `dependentRequired`, `dependencies`, and
  draft-04's `enum`, where the specs say they must be unique. A duplicate
  changes nothing. Draft-06 and later's `enum` stays
  `duplicate-enum-values`, a warning, because they say SHOULD. Rejected:
  `duplicate-enum-values` for draft-04 too, which would make a MUST a
  warning.
- A rule that some users' tools disagree with is still ported and still in
  `recommended`, if it's usually right. That's what configuration is for.
  `type-implied-by-const-or-enum` reports a `type` that code generators
  may want, and those users turn it off. A rule that's a matter of style
  is in `recommended` too, like `mergeable-schemas`.
  Rules that are much more opinionated, like whether `$defs` comes first
  or last, go in a style preset instead.
  The catalogue's rules that are matters of taste
  (`explicit_additional_properties`, `require_description_title`,
  `unknown_keywords_prefix`) weren't ported.
- A rule that compiles a schema isn't in `recommended`, however likely its
  finding is a mistake, because of what it can cost on a large schema.
  None does now: `invalid-default-or-example`,
  `keyword-implied-by-const-or-enum`, and `const-or-enum-value-rejected`
  compiled before lint evaluated lowered schemas (`evaluatorForLint`), and
  they're in `recommended` since. `keyword-implied-by-const-or-enum` was
  `assertion-implied-by-const-or-enum` until it checked applicators too.
- A catalogue rule whose premise the spec contradicts isn't ported.
  `content_media_type_without_encoding` says `contentMediaType` means
  nothing without `contentEncoding`, but no encoding means the string
  isn't encoded, and the specs' own examples do that.
- Messages are rewritten, not copied. The catalogue's say what to do
  ("Add `then`, `else`, or remove `if`."). Ours say what's wrong, in the
  keyword's own name, and are accurate for every dialect the rule works in.
  `if` alone isn't "no effect" in 2019-09 and later, because its
  annotations count for `unevaluated*`, so its message is "'if' without
  'then' or 'else' only collects annotations".
- Each rule gets a `.d.ts` that explains why it matters, tests (including a
  dialect without the keyword and a property with the keyword's name), a
  page in `website/linting/rules/` with examples, a row in its README's
  table, and a place in `recommended`, or in the style preset if it's much
  more opinionated. `src/lint/rule-pages.test.js` lints each page's
  examples the way the site does and checks them against the messages the
  page lists, and checks the README row and the severity the page says.

Rules of our own are added too, when porting turns up a mistake the
catalogue doesn't cover: `keyword-allows-nothing`,
`const-or-enum-value-for-disallowed-type`, `required-property-not-allowed`,
`keyword-without-type`, `required` against `maxProperties` in
`contradictory-limits`, `const-or-enum-value-rejected`,
`required-dependent-property`, `unevaluated-without-effect`,
`reference-by-location`, and
`invalid-default-or-example` checking values against the schemas that
apply theirs.
`keyword-implied-by-const-or-enum` also covers the catalogue's
`enum_validation_keywords_default`. `const_and_enum` isn't a rule of
its own: `enum` next to `const` is a keyword next to `const` like any
other, so `keyword-implied-by-const-or-enum` reports an `enum` that has
the `const` value, and `const-or-enum-value-rejected` reports a `const`
value that isn't in it. Rejected: a `const-and-enum` rule, because those
two cover it.
`empty_enum` is `keyword-allows-nothing`, which reports any keyword
nothing is valid against, from what it lowers to, like an empty `type`
too. Rejected: an `empty-enum` and an `empty-type` rule, one for each
keyword.
Names from the catalogue are a starting point, and change whenever a
better one, or a broader rule, suits.
