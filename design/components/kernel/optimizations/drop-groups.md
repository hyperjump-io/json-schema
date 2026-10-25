# `drop-groups.js`

Plugins mode only. Keyword groups with no effect the
plugins can see are left out, so they have no hook calls: `annotate`
when no plugin has an `annotation` hook and nothing is annotated. For
BASIC and DETAILED, that was worth 5–15%, more than merging. Without
plugins, the evaluators leave out `pass` and `annotate` groups that have
no effect as they build them, so there's nothing for it to do.
