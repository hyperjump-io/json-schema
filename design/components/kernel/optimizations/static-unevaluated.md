# `static-unevaluated.js`

Fast mode only. An `unevaluated` selector becomes
one that doesn't read marks where what the other groups in its schema
mark is known without the instance. `eachProperty({ unevaluated })`
selects the names they don't mark (`except`), and
`eachItem({ unevaluated })` starts after their prefix. One whose siblings
mark everything is `pass`. When nothing reads marks, the evaluators don't
track them. What's marked is known from the operations: operations that
apply a schema only under some condition (`any`, `one`, `cases`) count
only if nothing they apply marks anything, and `contains`,
`dynamicApply`, and `opaque` are never known. It only needs the marks of
a passing schema, because a schema whose sibling fails fails anyway,
which isn't true with plugins or annotations.
