# `combine.js`

A schema's keyword groups are a conjunction. Each schema they `apply` on
the same instance is inlined into it, transitively, and the operations of
the same kind are combined: `typeIs`s into the intersection of their
types (`number` and `integer` is `integer`), `range`s and counts into
their tightest limits, and identical operations into one. The schema is
then one group of what's left.

- **Only in `fast`.** Without plugins or annotations, only the result and
  marks matter, so the groups don't have to stay apart. `annotate` is
  left out, since nothing sees it, and the group the schema is left with
  has its first group's URI and location, which nothing reports.
- **What's inlined.** A schema that reads marks or the dynamic scope isn't
  inlined, and a schema that reads marks isn't rewritten, because what it
  reads is ordered against its own groups. If anything reads the dynamic
  scope, a schema is only inlined into one in the same resource, because
  entering a resource changes the scope. A schema that applies itself
  keeps the `apply` where it gets back to itself.
- **Each schema's conjunction is worked out once** and inlined from there,
  so inlining is linear in the kernel, not in the paths through it. The
  pass replaces only the schemas it inlines into or combines in.
- **Identical operations** are compared only when they have no
  subexpressions (and `apply`s by their schema), so the pass doesn't
  serialize whole subtrees.
- **It runs after `fold-passing`**, so schemas that always pass are
  already `pass`, and before `dispatch`, which then sees one schema's
  types and tags where they were spread over the schemas it applied.

Almost all of what it's worth is from inlining and identical operations,
like the `type: ["object", "boolean"]` of each vocabulary meta-schema an
`allOf` applies. Combining operations that differ adds at most 2%. FLAG
`validate` is 3–3.4× faster on the 2019-09 and 2020-12 meta-schemas, 24%
on `tsconfig.json`, and 1–6% on the other corpora. It costs about 4 ms on
`package.json`'s 4,304 schemas, and the first `validate` 6–7% more
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

## Open questions and limitations

- **Plugins.** A combined operation could have a source map of every group
  it came from, so each group's hooks still get its own result: the type
  is found once and each group's result is whether it's in that group's
  types. It isn't implemented, so with plugins nothing is inlined.
- **Whether it should depend on an optimization level.** It costs the
  first `validate` 6–7% on real schemas, and pays for itself in about 150
  validations of `package.json`. A setting for how much to optimize could
  leave it out for a schema that's validated once.
- **`equals` and `oneOfValues`** aren't combined, because intersecting
  them needs the kernel's equality (`1` is `1.0`). Only identical ones
  are one.
