# `combine.js`

A schema's keyword groups are a conjunction. Each schema they `apply` on
the same instance is inlined into it, transitively. How depends on what
the mode can see.

- **In `fast`**, only the result and marks matter, so the groups don't
  have to stay apart. The operations of the same kind are combined:
  `typeIs`s into the intersection of their types (`number` and `integer`
  is `integer`), `range`s and counts into their tightest limits, and
  identical operations into one. `annotate` is left out, since nothing
  sees it. The schema is then one group of what's left, with its first
  group's URI and location, which nothing reports.
- **With plugins or annotations**, every group keeps its hooks and its
  own result. An `apply` becomes an `inline` of the applied schema's
  groups, which are evaluated as groups of the schema they're in, nested
  in the group that applied them: `allOf`'s `beforeKeyword`, then each
  inlined group's hooks, then `allOf`'s `afterKeyword`. The inlined
  schema's own `beforeSchema` and `afterSchema` aren't called, which the
  [optimizer](../../../specs/kernel/optimizer.md) allows: which schemas
  are evaluated as schemas of their own can depend on optimizations. The
  groups are the source map: each operation is still in the group it came
  from. The `schema` state an inlined group's hooks get is the state of
  the schema it's evaluated in. Groups nothing in the mode can see are
  left out of an `inline`, as `drop-groups` leaves them out of a schema.
- **What's inlined.** A schema that reads marks or the dynamic scope isn't
  inlined, and a schema that reads marks isn't rewritten, because what it
  reads is ordered against its own groups. If anything reads the dynamic
  scope, a schema is only inlined into one in the same resource, because
  entering a resource changes the scope. A schema that applies itself
  keeps the `apply` where it gets back to itself. With plugins, a `false`
  schema isn't inlined, because its error is the schema's own, and neither
  is a schema with two or more groups that are only property operations,
  because the instrumented evaluator finds which of them each property is
  for in one loop, and inlined groups don't share it.
- **Each schema's conjunction (or groups) is worked out once** and inlined
  from there, so inlining is linear in the kernel, not in the paths
  through it. The pass replaces only the schemas it inlines into or
  combines in.
- **Identical operations** are compared only when they have no
  subexpressions (and `apply`s by their schema), so the pass doesn't
  serialize whole subtrees.
- **It runs after `fold-passing`**, so schemas that always pass are
  already `pass`, and before `dispatch`, which then sees one schema's
  types and tags where they were spread over the schemas it applied.
  `dispatch` sees through `inline` as it does through `apply`.

In `fast`, almost all of what it's worth is from inlining and identical
operations, like the `type: ["object", "boolean"]` of each vocabulary
meta-schema an `allOf` applies. Combining operations that differ adds at
most 2%. FLAG `validate` is 3–3.4× faster on the 2019-09 and 2020-12
meta-schemas, 24% on `tsconfig.json`, and 1–6% on the other corpora. It
costs about 4 ms on `package.json`'s 4,304 schemas, and the first
`validate` 6–7% more. With plugins, it's up to 11% faster with hooks that
do nothing, 14% with BASIC, and 19% annotating on the 2020-12
meta-schema, and within 2% either way on the other corpora
([Inlining and combining](../../../benchmarks/kernel-in-src/combine.md)).

## Rejected

- **Inlining without leaving out `annotate`.** The evaluators leave out a
  group that's only `annotate`, but not an `annotate` in a group with
  other operations, so inlined annotations were evaluated, and a schema
  that only checks the type stopped looking like one. The 2020-12 corpora
  were 8–22% slower.
- **Working out what to inline for each schema on its own.** It
  recomputed every schema's inlining from each schema that inlines it:
  9 ms on `package.json`.
- **Combining operations across groups with plugins**, as one operation
  with a source map of the groups it came from. Each group still needs
  its own hooks and its own result, so a combined `typeIs` would save one
  type lookup per group, next to two hook calls per group. Without hooks,
  combining operations that differ was worth at most 2%.
- **Inlining schemas with a merged property loop, with plugins.** Each
  inlined group looped over the properties on its own:
  `package.json` as 2020-12 was 3.4% slower with hooks.

## Open questions and limitations

- **Whether it should depend on an optimization level.** It costs the
  first `validate` 6–7% on real schemas, and pays for itself in about 150
  validations of `package.json`. A setting for how much to optimize could
  leave it out for a schema that's validated once. With plugins, it adds
  about 6 ms to optimizing `package.json`, 2.5 ms of it the pass and the
  rest `dispatch` and `drop-groups` going through the inlined groups.
- **`equals` and `oneOfValues`** aren't combined, because intersecting
  them needs the kernel's equality (`1` is `1.0`). Only identical ones
  are one.
- **Annotating `package.json`** is 2% slower, the only corpus that is.
