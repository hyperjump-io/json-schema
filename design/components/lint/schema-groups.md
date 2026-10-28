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

## Required properties (`src/lint/required-properties.js`)

`contradictory-limits` compares `maxProperties` with the fewest properties
a valid object can have: required properties, dependencies, `allOf` and
`$ref`, the smallest `anyOf` branch, and `if`/`then`/`else`, with a message
on the limit and one on each keyword that requires some.
`impossible-property` finds a property no valid object can have. It still
credits a schema to the keyword whose value it's in, by location, which is
about the document.
