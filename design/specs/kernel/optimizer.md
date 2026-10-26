# Optimizer

The optimizer rewrites expressions for evaluation. Without plugins,
anything that keeps the result and the marks is allowed, like inlining
`apply` or `not` of `not`. What's implemented is merging a schema's
property operations into one loop and its array operations into one
evaluator, checking an item schema that only checks the type in the loop
over the items, resolving `unevaluated` selectors that
don't depend on the instance, folding schemas that always pass,
evaluating only the expressions of an `any` or `one` that can pass the
instance's type or tag (as a `typeSwitch`, `propertySwitch`, or
`keySwitch`), and leaving
out groups with no effect ([Optimizations](../../components/kernel/optimizations/README.md)).

With plugins, what plugins see can depend on the optimizations: which
schemas are evaluated as schemas of their own, how DETAILED nests, the
order of siblings, how often something is evaluated. A coverage plugin
reports what was evaluated, which is true of that evaluation. What
plugins see can't be wrong, though:

- **Every hook call is about what it says.** Each keyword group a merged
  operation came from still gets its own `beforeKeyword` and
  `afterKeyword`, with its own result, so an error is never reported at a
  keyword that didn't fail. Conditions stay recognizable: BASIC drops a
  condition's errors when `afterSchema` says it's a condition of the
  keyword that applied it, so a condition can't be inlined in a way that
  loses that.
- **Nothing stops early** when a plugin needs every error. `any` stopping
  at the first that passes, `one` at the second, and a schema at its first
  failure are only without plugins. Leaving out what can't pass the
  instance's type or tag isn't stopping early: it's decided before
  anything is evaluated, and plugins get the errors of what's evaluated.
  An `anyOf` or `oneOf` that fails has its own error and the errors of the
  schemas for the instance's type or tag, without the type or tag errors
  of every other schema. For a schema that applies itself through every
  branch, like a syntax tree, reporting those took time exponential in the
  instance's depth.

An optimization keeps this with a **source map**: each part of an
optimized expression says which keyword group it came from, so the
evaluator can make that group's hook calls with its result. It doesn't
have to reproduce the tree of hook calls from before the kernel. Without
optimizations, evaluation with plugins makes the same hook calls as
`specialize` did, which is how the implementation was checked. With
optimizations, it's checked by validity, annotations, and the optimized
hook calls being a subsequence of the unoptimized ones.

Hook calls nest (see [Schemas and keyword groups](schemas-and-groups.md)), so across groups, only
the *matching* of a merged property loop can be merged with plugins. One
pass over the properties finds which groups' operations each one is for,
testing each pattern once and taking `additionalProperties` as "nothing
else matched". Each group then evaluates its matches between its own
hooks. The list of matches, by group, is the source map. The same pass
finds which required names the instance has, so a `required` group's
result comes from the matching too. Without plugins, the evaluation is
merged too.

Optimizations can depend on which hooks the plugins have. Without an
`annotation` hook (BASIC, DETAILED), `annotate` has no effect, so a group
that only annotates is left out, and a schema that's left with nothing is
`pass` where it's applied. That was worth more with BASIC than merging
([Kernel prototype from the schema AST](../../benchmarks/kernel-prototype-from-ast/README.md)).
