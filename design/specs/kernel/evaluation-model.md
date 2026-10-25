# Evaluation model

An expression is evaluated on an instance value. It has a result (valid or
not), the property names or item indexes it marks as evaluated, and the
annotations it makes.

- **Types.** An instance is `null`, `boolean`, `number`, `string`, `array`,
  or `object`. `integer` is a number with no fractional part, including one
  written like `1.0`, and it's only something `typeIs` tests for.
- **Applies to.** Every operation has the types it applies to. On an
  instance of any other type, it passes without marking or annotating
  anything. That's how lint knows which types a keyword applies to, and it
  doesn't need a table.
- **Subexpressions** are evaluated on the same instance, or on a child of
  it: a property's value, an item, or a property name. Each operation says
  which.
- **Marks.** An operation's marks are kept only if it passes. A
  subexpression's marks on the same instance are its parent's marks.
  Marks made on a child are about the child, so they never reach the
  parent. They're used by `unevaluated` selectors only. A marked property
  name and a marked item index can't be confused, because an instance can't
  be both an object and an array.
- **Annotations** are kept only if the expression that made them and every
  expression it was evaluated through pass. Plugins see every annotation,
  as they did before the kernel.
- **Values that couldn't be parsed** (`json-missing` and `json-invalid`
  nodes when evaluating JSON text) pass every schema. A property whose value
  couldn't be parsed is still present for `hasProperty`.
- **Explains its failure.** An operation explains its failure if it fails
  only when a subexpression fails, and their failures say why. The BASIC
  output format reports only the subexpressions' errors for those. This
  replaced `simpleApplicator`. It's what `simpleApplicator` said, except
  for `conditional`, for `dependencies` when every dependency is a schema,
  and for `anyOf` and `oneOf` of one schema, which explain their failures,
  so BASIC reports less.
