# Logic and schemas

| Operation | Applies to | Passes when | Marks |
| --- | --- | --- | --- |
| `{ op: "pass" }` | – | always | – |
| `{ op: "fail" }` | everything | never | – |
| `{ op: "all", of: Expression[] }` | everything | every one passes | every one's |
| `{ op: "any", of: Expression[] }` | everything | at least one passes | the passing ones' |
| `{ op: "one", of: Expression[] }` | everything | exactly one passes | the passing one's |
| `{ op: "not", of: Expression }` | everything | it fails | – |
| `{ op: "cases", cases: [Expression, Expression \| null][], otherwise: Expression \| null }` | everything | see below | the condition's and branch's that applied |
| `{ op: "typeSwitch", cases: { [type: JsonTypeName]?: Expression }, otherwise: Expression }` | everything | the branch for the instance's type passes | the branch's that applied |
| `{ op: "propertySwitch", name: string, cases: [Scalar, Expression][], other: Expression, absent: Expression, unparsed: Expression }` | object | see below | the branch's that applied |
| `{ op: "keySwitch", cases: [string, Expression][], none: Expression, unparsed: Expression }` | object | see below | the branch's that applied |
| `{ op: "apply", schema: Handle }` | everything | the schema passes | the schema's |
| `{ op: "dynamicApply", anchor: string, fallback: Handle \| null }` | everything | see below | the applied schema's |

- `apply` and `dynamicApply` explain their failures. `all` does if every
  one of its expressions does (`required` lowers to an `all` that doesn't),
  and `cases`, `typeSwitch`, `propertySwitch`, and `keySwitch` do if every
  branch does.
  `any` and `one` of one expression do, because "none passed" is then just
  "it failed", so `any` of one can be the one in normal form.
- **`typeSwitch`** applies the branch for the instance's JSON type (an
  integer is a `number`), or `otherwise` for a type it has no branch for.
  **`propertySwitch`** applies, to an object, the branch for the value of
  its property `name`: the case whose value equals it (`1` equals `1.0`),
  `other` if none does, `absent` if the object doesn't have the property,
  or `unparsed` if its value couldn't be parsed. Values are scalars, so an
  object or array value is `other`. If two cases have the same value, the
  first applies. **`keySwitch`** applies, to an object, the branch of the
  first case whose property it has with a value that was parsed, `none` if
  it has none of the properties, or `unparsed` if the ones it has all have
  values that couldn't be parsed.
  The switches are `cases` that an evaluator can look up instead of
  testing each condition, so they aren't lowered from keywords: the
  optimizer makes them (see [Optimizer](../optimizer.md)). `typeSwitch` passes an instance
  that couldn't be parsed, as every schema does. A property's value that
  couldn't be parsed would equal every value and pass every schema, so it
  gets a branch of its own: the optimizer makes it what the switch
  replaced, so the result is the same as before, errors included.
- **`cases`**: the first case whose condition passes applies its branch
  (`null` passes). If no condition passes, `otherwise` applies (`null`
  passes). A condition that fails is a condition, not an error: the output
  formats drop its errors, which they find from the operation instead of
  the `if` and `conditional` keyword URIs. `if`/`then`/`else`, v1's
  `conditional`, `dependentSchemas`, `dependentRequired`, and
  `propertyDependencies` all lower to it.
- **A condition has to say its type.** An operation passes instances it
  doesn't apply to, so `hasProperty(name)` alone is a condition that passes
  every string and array, and `cases([[hasProperty(name), S]], null)` would
  apply `S` to them. A condition about properties is
  `all(typeIs(["object"]), hasProperty(name))`, written `isObject` below.
  User-defined keywords have to do the same.
- **`any`, `one`**: without plugins or annotations, `any` can stop at the
  first that passes unless something reads what's evaluated, and `one` can
  stop at the second.
- **`dynamicApply`** applies the outermost schema in the dynamic scope with
  the dynamic anchor `anchor`. If there isn't one, it applies `fallback`,
  and if that's `null`, it's an error (v1's `$dynamicRef` without an anchor
  in scope). It has no dialect rules. 2020-12's bookending and 2019-09's
  `$recursiveAnchor` decide whether a reference uses the dynamic scope at
  all, from the dynamic anchors of the resource it resolves to, which are
  known when lowering. So lowering decides: a reference that doesn't use
  the dynamic scope is a plain `apply`.
