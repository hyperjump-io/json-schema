# What a keyword group does (`src/lint/effect.js`)

Lint has no facts about keywords that only lint reads, like a default
value. Whether a keyword does anything comes from what it lowers to.
`effect.js` says what a keyword group does: `none`, `marks`, `marksAll`,
or `some`.

- It follows what a group applies, so a schema with no effect counts as
  `true`. References are followed with `findSchema`, into other documents
  too. One that can't be followed is `some`.
- Otherwise it's conservative: `any` or `one` with a schema that has an
  effect, and what a schema applied to a property or an item marks, are
  `some`.
- A sibling's default value lowers the same as leaving it out (see
  [Normal form](../../specs/kernel/normal-form.md)), so a keyword has the
  same expression with its default value as without it.

The rules built on it:

- **`keyword-without-effect`** reports a keyword whose group always passes
  and doesn't annotate or mark anything. It also reports a sibling its
  reader lowers the same without (`minContains: 1`). A keyword that only
  marks particular properties or items (`properties: {"a": true}`, or a
  pattern) is reported only if nothing in its schema group reads marks and
  the group isn't open. In an open group, an `unevaluated*` that applies
  the schema from another document can read them, and there are good
  reasons to write it. Any subschema could be referenced from another
  document, but the rule assumes only the root and definitions are, which
  is what `open` says. It leaves a keyword that declares siblings to the
  rules about them (`if-without-then-else`,
  `content-schema-without-media-type`,
  `additional-items-without-items-array`,
  `min-contains-zero-without-max-contains`), so they aren't reported
  twice. Unknown keywords are `unknown-keyword`'s, in every dialect,
  because it's mostly a check for misspellings: it suggests a keyword
  that's close, and its `ignore` option lists names not to report.
- **`empty-catch-all-schema`** reports a keyword that applies a schema with
  no effect to every property or item that others don't
  (`additionalProperties: true`, `items: {}`, `unevaluatedProperties:
  true`): `eachProperty` with an `except` or `unevaluated` selector, or
  `eachItem`. It's reported even when an `unevaluated*` could read its
  marks, because writing it is a mistake.
- **`const-or-enum-keywords`** skips a keyword with `none` or `marksAll`.

These replaced `Keyword.default` and `keyword-with-default-value`.
