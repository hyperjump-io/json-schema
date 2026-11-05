# Schema groups (`src/lint/schema-group.js`)

A schema group is the schemas that apply to the same instance as a schema:
what it applies in place, through `allOf`, `$ref`, and so on. Rules like
`required-property-not-defined` look across a group.

- Which keywords apply schemas in place or to children comes from the
  expressions, not lists of keyword URIs. An `apply` outside the operations
  on a property or an item is in place, and its links say whether it's
  under `not` (`negated`) or a condition of `cases` (`condition`), which
  `isNegated` and `invalid-default-or-example` read instead of the URIs of
  `not` and `if`.
- A schema an `opaque` operation applies isn't linked, and a reference in
  one makes the group `unknown`.
- A schema that's only annotated (`contentSchema`) or not applied at all
  (`then` without `if`) is open and not applied, like one in `$defs`.
- Dynamic references are found by `dynamicApply`, so a `$dynamicRef` that
  doesn't use the dynamic scope is followed like `$ref`.
- `mergeable-schemas` reads `readsMarks`.

## What has to pass (`src/lint/in-place.js`)

`keywordsThatMustPass` is a schema's keywords and the keywords of the
schemas it applies in place that have to pass whenever it does: an
`apply` that's a keyword's expression or in its `all`, like `allOf`'s and
`$ref`'s, followed from there. What's in `any`, `one`, `not`, or `cases`
doesn't have to pass. It's found from the expressions, like everything
here, because a schema group's links don't say which schemas have to pass
without the keyword URIs.

- `contradictory-limits` compares the limits of all of them
  (`boundsInPlace`), and `required-property-not-allowed` what they require
  with what they don't allow, so a contradiction across `allOf` or `$ref`
  is found. Until 2026-11-04, both only looked at one schema.
- A keyword from an applied schema counts as the keyword in the schema that
  applied it (`creditedKeyword`), the way required properties do. The
  message is on that keyword and names it ("'maximum' in '$ref'"), because
  the applied schema can be anywhere in the document.
- When both sides are from the same applied schema, its own group has them,
  so it's reported there and not again in every schema that applies it.
- Each applied schema is followed once, and only in the document's own
  schemas, so a reference to another document isn't followed.
- `contradictory-limits` only compares a schema's own `maxProperties` with
  what's required, which already follows applied schemas. One in an
  applied schema would otherwise be reported twice.
- Rejected: following the links of `schemaGroup`. They go both ways and
  include schemas that don't have to pass, like `anyOf`'s, and telling them
  apart would take the keyword URIs.

## Required properties (`src/lint/required-properties.js`)

`contradictory-limits` compares `maxProperties` with the fewest properties
a valid object can have: required properties, dependencies, `allOf` and
`$ref`, the smallest `anyOf` branch, and `if`/`then`/`else`, with a message
on the limit and one on each keyword that requires some.
`impossible-property` finds a property no valid object can have. It still
credits a schema to the keyword whose value it's in, by location, which is
about the document.
