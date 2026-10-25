# `siblings`

A keyword that reads its siblings' values, like `additionalProperties`
reading `properties`, declares them in `siblings`, a record of names it
chooses to keyword URIs.

- `lower` and `check` get their values by those names (`context.siblings`
  for `check`) and have no other way to find a sibling, so the declaration
  can't drift from what the keyword reads. Tools use it too, like
  `mergeable-all-of-schema`.
- Each sibling is parsed by its own keyword's shape. A sibling that's
  missing, or whose value didn't fit its shape or failed its check, is
  `undefined`.
- They're recorded as the keyword group's `sources`.
- What a keyword reads of the evaluation (marks, the dynamic scope) isn't a
  sibling. It's in its expression.
