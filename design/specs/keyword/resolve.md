# `resolve`

An optional hook for keywords that identify schemas (`$id`, `$anchor`,
`$dynamicAnchor`, legacy `id`/`$id`/`$ref`, `$recursiveAnchor`) or define
dialects (`$vocabulary`).

- It records effects (`setBaseUri`, `addAnchor`, `addDynamicAnchor`,
  `setReference`, `defineDialect`) that are applied after every keyword in
  the schema has been seen, so keyword order doesn't matter.
- `setReference` makes the schema a reference node and discards everything
  else in it, including messages.
