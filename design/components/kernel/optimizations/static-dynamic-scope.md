# `static-dynamic-scope.js`

Each `dynamicApply` becomes an `apply` of what its anchor
identifies, so the evaluators don't track the dynamic scope. Evaluation
always starts from the kernel's entry, so the anchors in scope where a
schema is applied only depend on the path to it. A schema applied with
different anchors in scope is copied for each of them. It's the
elimination of dynamic references in Attouche et al., "Validation of
Modern JSON Schema: Formalization and Complexity" (POPL 2024,
[doi:10.1145/3632891](https://dl.acm.org/doi/10.1145/3632891), section 8),
made from the entry and only as needed.

- **Which anchors a schema can read.** That's its own `dynamicApply`'s,
  and the ones of every schema it can apply, through every schema a
  `dynamicApply` could apply (what any resource's anchor of that name
  identifies, and its fallback). A schema that can't read any is shared,
  never copied, and its expressions aren't rewritten.
- **Copies are by what the anchors a schema can read identify**, starting
  from the entry, whose own resource's anchors are in scope. Anchors it
  can't read don't make copies, and two orders of the same resources that
  leave the same anchors in scope are one copy. The first copy of a
  schema keeps its handle. Later ones are the handle, a space, and a
  number, which can't be a schema's handle because a URI can't have a space.
- **It's for every mode.** Evaluation makes the same hook calls, in the
  same order, as it would tracking the dynamic scope. A copy's handle
  isn't a location, so a copy has the handle of the schema it copies
  (`copyOf`), and the instrumented evaluator reports that as its
  `SchemaInfo`'s location and in `KeywordInfo.conditions`, which BASIC and
  DETAILED compare. A copy shares the schema's `SchemaInfo` and its groups'
  `KeywordInfo`s, by location, so each schema and keyword still has one
  info per evaluator, whichever copy is evaluated. A `KeywordInfo`'s
  `expression` is the first copy's, and its `apply`s can name copies.
- **The common case has no copies.** The outermost anchor wins, so an
  anchor the entry's resource defines identifies the same schema
  everywhere. Validating against a meta-schema, every `$dynamicRef` is to
  `"meta"`, which the meta-schema defines, and none of its schemas are
  copied. A schema is only copied when it's reached through different
  resources that each define an anchor it reads and the entry's resource
  doesn't, like the spec's `tree` and `strict-tree` both applied from one
  schema that doesn't define `node`.
- **It gives up past one copy for each schema that can read an anchor.**
  The number of copies can be exponential in the number of anchor names:
  validating with dynamic references is PSPACE-complete in the size of the
  schema, and the paper's proof encodes a quantified Boolean formula, a
  choice of resources for each variable (`choices` in the tests). When it
  gives up, the kernel is unchanged and the evaluators track the dynamic
  scope as before. Only the pass's own time is lost.
- **Schemas that read the dynamic scope and weren't copied are removed.**
  A resource's dynamic anchors are lowered whether anything applies them
  or not, and one that reads the dynamic scope would keep the evaluators
  tracking it. Nothing left in the kernel applies them: a schema that
  can't read an anchor can't apply one that can. This is why a pass can
  return `null` for a schema.
- **An `opaque` operation that reads the dynamic scope** looks an anchor
  up when it's evaluated, and would get the schema, not its copy, so a
  kernel with one isn't changed.
- **A `dynamicApply` whose anchor isn't in scope, with no fallback**, is an
  error when it's evaluated, so it stays, and the evaluators track the
  dynamic scope. The copies keep their schema's resource, so the dynamic
  scope they track is the same.
- **It runs first**, so the passes after it see an `apply`.
  `static-unevaluated` can then know what a `$dynamicRef` next to
  `unevaluatedProperties` marks.

On meta-schemas, FLAG `validate` is 37–43% faster, about 30–35% of it from
not tracking the dynamic scope, with plugins 8–13% faster, and BASIC up to
12%, and the pass costs about 0.12 ms when the evaluator is built
([Resolving the dynamic scope](../../../benchmarks/kernel-in-src/static-dynamic-scope.md)).

## Rejected

- **The paper's translation as it's written**: a copy of every schema for
  every list of the kernel's resources without repetitions. That's between
  n! and (n + 1)! copies of each schema for n resources, almost none of
  them reachable. It's what proves the reduction, not an algorithm.
- **Copies by the list of resources entered**, the paper's context. Lists
  that leave the same anchors in scope, or differ only in anchors a schema
  can't read, are the same for that schema. The paper's polynomial
  algorithm for a bounded number of dynamic references (section 7)
  memoizes by the same equivalence.
- **Giving plugins expressions with the copies' `apply`s mapped back** to
  the schemas they copy. It's a copy of every copied group's expression
  when the evaluator is built, for a field plugins don't use, and plugins
  already see expressions the passes rewrote, like `dispatch`'s
  `typeSwitch`.
- **Telling a copy's location from its handle**, by dropping what's after
  the space. Where a copy came from is the pass's to say, not a convention
  evaluators have to know.
- **Resolving only the anchors the entry's resource defines.** It covers
  the meta-schemas without copies, but copies cost nothing when they
  aren't needed, and it leaves `tree` and `strict-tree` tracking the
  dynamic scope.

## Known limitations

- **No real schema here needs copies.** The budget is a guess, set by the
  tests' exponential schema and not by measurements. Going over it is
  never wrong, only slower, so it can change when a real schema needs
  copies.
