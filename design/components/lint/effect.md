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
  marks properties or items (`properties: {"a": true}`, a pattern, or
  `additionalProperties: true`) is reported only if nothing in its schema
  group reads marks and the group isn't open. In an open group, an
  `unevaluated*` that applies the schema from another document can read
  them, and there are good reasons to write it. Any subschema could be
  referenced from another document, but the rule assumes only the root and
  definitions are, which is what `open` says. A keyword without effect
  because of its siblings is reported, and by the rule about them too, like
  `content-schema-without-media-type` (see [Rules](rules.md)). Unknown
  keywords are `unknown-keyword`'s, in every dialect, because it's mostly a
  check for misspellings: it suggests a keyword that's close, and its
  `ignore` option lists names not to report, which wouldn't work if this
  rule reported them too.
- **`empty-catch-all-schema`** reports a keyword that applies a schema with
  no effect to every property or item that others don't
  (`additionalProperties: true`, `items: {}`, `unevaluatedProperties:
  true`): `eachProperty` with an `except` or `unevaluated` selector, or
  `eachItem`. It's reported even when an `unevaluated*` could read its
  marks, because writing it is a mistake.

- **`empty-then-else`** reports a branch of a `cases` (`then`, `else`, a
  schema in v1's `conditional` or `dependentSchemas`) whose schema has no
  effect, with `effectOf`'s `handle`, which says what a schema a keyword
  applies does.

These replaced `Keyword.default` and `keyword-with-default-value`.

## What's evaluated (`src/lint/evaluated.js`)

`marksEvery` says whether a schema's keywords, other than one, mark every
property or item whenever they pass, following what they apply in place.
`additionalProperties` lowers to an `except` selector, which marks
everything if what it leaves out is marked too, by `property` and pattern
selectors. It's the same for `eachItem` from an index and the `item`s
before it. An `unevaluated` selector or `itemSequence` marks everything.
What every branch of `any`, `one`, `cases`, and the switches marks is
counted, and anything else isn't. The schema's own keywords are all that
an `unevaluated*` in it reads, so what's around it doesn't matter, and
`open` doesn't either.

- **`unevaluated-without-effect`** reports an `unevaluated*` whose schema
  marks every property or item without it, even one with a schema that
  allows everything, which `empty-catch-all-schema` reports too.

Both modules follow `apply` with `appliedSchemas` (`src/lint/applied.js`).
