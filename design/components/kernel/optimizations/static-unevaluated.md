# `static-unevaluated.js`

Without plugins. An `unevaluated` selector becomes
one that doesn't read marks where what the other groups in its schema
mark is known without the instance. `eachProperty({ unevaluated })`
selects the names they don't mark (`except`), and
`eachItem({ unevaluated })` starts after their prefix. One whose siblings
mark everything is `pass`. When nothing reads marks, the evaluators don't
track them. What's marked is known from the operations: operations that
apply a schema only under some condition (`any`, `one`, `cases`) count
only if nothing they apply marks anything, and `contains`,
`dynamicApply`, and `opaque` are never known, but it runs after
[`static-dynamic-scope`](static-dynamic-scope.md), which usually leaves an
`apply` for a `dynamicApply`. It only needs the marks of
a passing schema, because a schema whose sibling fails fails anyway.
That's true when annotating, because a schema's annotations are only kept
if it passes, and annotating OpenAPI 3.1 documents was 0.79–0.85 times as
long with it ([Unevaluated when annotating](../../../benchmarks/kernel-in-src/unevaluated-when-annotating.md)).
It isn't true with plugins, which see the results of schemas and keywords
that fail, and get `annotation` calls for annotations that aren't kept.
