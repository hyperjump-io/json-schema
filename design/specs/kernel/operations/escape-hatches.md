# Escape hatches

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "predicate", keyword: string, value: Json, types: TypeName[] }` | `types` | the evaluator the keyword's `evaluate` built returns true |
| `{ op: "opaque", keyword: string, value: Json, schemas: Expression[], explainsFailure?: boolean, reads?: EvaluationState[] }` | everything | the evaluator the keyword's `evaluate` built returns true |

The keyword's `evaluate(value, context)` is called once for each operation
when an evaluator is built, and returns `(instance) => boolean`, so work
that only depends on the value is done once, as it is for the kernel's
other operations. The context's `op` says which one it's for.

- **`predicate`** is a check that isn't one of the kernel's operations. Its
  context has the `InstanceOps` to read the instance with, so an AST node is
  never converted. The kernel does the type check, so the evaluator only
  gets instances of `types`. It applies no schemas and marks nothing, so
  passes can see past it, and lint knows the types it applies to, but not
  what it checks.
- **`opaque`** is an applicator that isn't. What it applies is `schemas`,
  its subexpressions (usually `apply`), and `value` is only data, so nothing
  in the data is mistaken for a schema. The kernel knows what the keyword
  applies, but nothing else. The context has the evaluators of `schemas`,
  in order, each evaluating on the same instance or, given a segment, on a
  child; `markEvaluated`; `annotate`, when annotations can be seen;
  `exhaustive`, when it can't stop early; and `evaluated()` and
  `dynamicAnchor(name)` when it `reads` them. They read the evaluation in
  progress, so they only work while the evaluator runs. What's applied on
  the same instance marks for the keyword only if it passes, and what the
  keyword marks is kept only if it passes. `schemas` are in the normal
  form, but other passes treat the operation as a barrier: nothing is folded
  inside it, and `static-unevaluated` doesn't know what it marks.
