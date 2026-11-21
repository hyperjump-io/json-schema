# `lower`

`lower(value, siblings, context)` returns what the keyword means, as a
[kernel](../kernel/README.md) expression. [Every keyword](../kernel/every-keyword.md)
lists what each built-in keyword lowers to.

- It's synchronous and only reads its inputs and the context (`dialect`
  and `keywordName`). It doesn't get the definitions. Rejected: giving it
  them, when only `format` would use them, for the `validateFormats`
  config and to check that the format's definition exists.
- The kernel retrieves what references in the value and in the siblings
  it reads refer to before `lower` is called, so `lower` only gets
  references that are there. It isn't called if the value didn't fit its
  shape.
- A keyword without `lower` has no keyword group (`$id`, `$defs`, and
  `then`, `minContains`, and draft-04's `exclusiveMaximum`, which their
  siblings read).
- A keyword that has a group but no effect (`uniqueItems: false`, an
  unknown keyword that isn't an annotation) lowers to `pass`, so plugins
  see it pass, and the optimizer leaves it out when nothing can see it.
- `format` decides whether it asserts when it's lowered, from the
  dialect's `assertFormats`, so a serialized expression means the same
  wherever it's restored. The `validateFormats` option is applied to
  every dialect the media types have or a session builds from a
  meta-schema. That the
  format's definition exists is checked with the kernel's other
  definitions (see [Compile and evaluate](../../components/kernel/README.md)).

## Escape hatches

Every built-in keyword lowers to the kernel's operations. One that can't
uses an escape hatch: `predicate`, a check, or `opaque`, an applicator (see
[Escape hatches](../kernel/operations/escape-hatches.md)).

- The keyword's `evaluate(value, context)` is called once for each such
  operation when an evaluator is built, and returns `(instance) =>
  boolean`, so work that only depends on the value is done once. The
  context is discriminated by `op`.
- `opaque` has its schemas in a field of their own, apart from `value`,
  which is only data, so nothing in the data is mistaken for a schema. The
  context has their evaluators, in order. Placeholders for schemas in
  `value` were considered and rejected for that reason.
