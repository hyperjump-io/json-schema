# Redundant schemas (`src/lint/redundant-schemas.js`)

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

## Rejected

- **Not reporting a schema that's only `const` or `enum` values**, so the
  idiom isn't reported by default. It would also miss `{ "const": 3 }`
  next to `{ "minimum": 0 }`, and a rule doesn't leave out what's true
  because it's sometimes meant.
- **Merging it with `duplicate-all-of-any-of-schemas`.** A duplicate is
  two schemas that imply each other, but that rule also reports schemas
  that annotate the same, and "it's already there" is a clearer message
  for a copy.

## Open questions and limitations

- **`oneOf`** isn't reported. A schema in `oneOf` that allows nothing
  another one doesn't can never be the one that passes, so every value it
  allows fails. That's a rule of its own, like `duplicate-one-of-schemas`.
- **Keywords next to the `allOf` or `anyOf`** aren't compared with its
  schemas, so `minimum: 5` next to `allOf: [{ "minimum": 3 }]` isn't
  reported.
