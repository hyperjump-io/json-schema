# Redundant, covered, and exclusive schemas (`src/lint/redundant-schemas.js`)

`redundant-all-of-any-of-schemas` reports a schema in `anyOf` that allows
nothing another one doesn't, and a schema in `allOf` that allows
everything another one does. `redundantSchemas` finds them from what the
keywords lower to: an `any` or `all` of `apply`s, compared with the
kernel's [`implies`](../kernel/implies.md).

- **Only what's sure is reported.** `implies` doesn't know every
  implication, so the rule misses some, like a `pattern` that's stricter
  than another.
- **A schema has to do nothing but pass or fail.** One that annotates
  isn't reported, and one that marks properties or items isn't reported
  if its schema's group reads marks or is open, as in
  `keyword-without-effect` ([What a keyword group does](effect.md)). The
  other schema's marks and annotations don't matter, because it stays.
- **A schema something could refer to isn't reported**, or one with such
  a schema in it: what a static reference in the document or one it
  reaches finds, a schema with an identifier (`$id`), and one with an
  anchor or a dynamic anchor (`referableSchemas`). Leaving it out breaks
  the reference. An identifier or anchor counts without a reference to
  it, because it's there to be referred to, and another document could.
  A `$defs` nothing refers to doesn't count.
- **Of two schemas that allow the same, the later one is reported**,
  unless it has another effect and the earlier one doesn't. Then the
  earlier one is the one that can be left out.
  `duplicate-all-of-any-of-schemas` reports the ones that are written the
  same too, since a rule reports everything it finds ([Rules](rules.md)).
  It also reports duplicates that annotate the same, which this doesn't.
- **Only the document's own schemas are compared**, like
  `sameExpression`. A reference into another document implies only a
  reference to the same place.
- **The message names the other schema** by its index in the keyword
  ("'anyOf/1'"), because the reason is a schema that can be far away in a
  long `anyOf`.
- **Known values next to their type are reported**, like
  `anyOf: [{ "enum": ["a", "b"] }, { "type": "string" }]`. It's often
  written on purpose, so editors suggest the values, and the report is
  still true. Turning a rule off where it's on purpose is what
  [configuration comments](configuration-comments.md) are for. Of the 44
  findings in the 49 schemas of the benchmark corpora, 11 were that, and
  32 came from a mistake.

## `covered-one-of-schemas`

In `oneOf`, a schema that allows nothing another one doesn't can never be
the one that passes: every value it allows matches both, and fails.
`coveredSchemas` finds them with the same comparison.

- **It's about the result, so marks and annotations don't matter.** A
  schema with a `title` is reported.
- **Two schemas that allow the same are both reported**, because neither
  one's values can pass. `duplicate-one-of-schemas` reports the later one
  too.
- **A schema that allows nothing isn't reported**, as far as `excludes`
  knows: one that excludes `pass`, like `false`, `not: {}`, or limits
  that don't overlap. It implies every schema, but it has no values to
  fail.
- **It's a rule of its own**, like `duplicate-one-of-schemas`, because the
  schema isn't redundant. It's why valid-looking values are rejected.

## `exclusive-one-of-schemas`

A `oneOf` whose schemas all exclude each other (the kernel's
[`excludes`](../kernel/implies.md)) says what `anyOf` of them says.
`exclusiveSchemas` finds them.

- **It isn't in a preset.** 94% of the `oneOf`s in the benchmark corpora
  are like this, and writing `oneOf` for alternatives is a choice, not a
  mistake. It's the first rule outside `recommended`, so its page says
  "Not in a preset.", which `rule-pages.test.js` checks, and the rules'
  README lists it apart.
- **The message is on the keyword**, once, not on each schema.
- **`anyOf` is the dialect's name for the keyword**, like `const` in
  `single-value-range`, and nothing is reported in a dialect without it.
- **A `oneOf` of one schema isn't reported.** `mergeable-schemas` reports
  that.

## Rejected

- **Not reporting a schema that's only `const` or `enum` values**, so the
  idiom isn't reported by default. It would also miss `{ "const": 3 }`
  next to `{ "minimum": 0 }`, and a rule doesn't leave out what's true
  because it's sometimes meant.
- **Merging it with `duplicate-all-of-any-of-schemas`.** A duplicate is
  two schemas that imply each other, but that rule also reports schemas
  that annotate the same, and "it's already there" is a clearer message
  for a copy.

- **A rule for a `oneOf` whose schemas might match the same value.**
  `excludes` not knowing that they can't isn't knowing that they can.
  `covered-one-of-schemas` reports the case that's sure.
- **A rule for schemas in `allOf` that exclude each other.** The
  benchmark corpora have none, and the rules for limits, values, and
  required properties report the ones in one schema.

## Open questions and limitations

- **A schema that allows nothing in a way `excludes` doesn't know**, like
  a `pattern` nothing matches, is reported by `covered-one-of-schemas` if
  another schema allows everything it could, though it has no values to
  fail.
- **Keywords next to the `allOf` or `anyOf`** aren't compared with its
  schemas, so `minimum: 5` next to `allOf: [{ "minimum": 3 }]` isn't
  reported.
