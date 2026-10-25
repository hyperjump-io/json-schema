# Evaluating for lint

Lint evaluates the lowered expressions on values in the document, like a
`default` or the values of an `enum`, without compiling
(`evaluatorForLint` in `src/lint/evaluate.js`). A result is pass, fail, or
unknown, so a rule reports only what's sure.

- Before evaluating, every schema the document's expressions apply is
  found: a subschema by its location, and a reference with `findSchema`,
  lowering the document it's in. Evaluating is then synchronous.
- **Unknown** is a reference that can't be followed, a schema whose dialect
  isn't known, `dynamicApply` (the dynamic scope depends on what applies
  the schema), `opaque`, and a schema applied to an instance it's already
  being evaluated on. `predicate` is evaluated with the keyword's
  `evaluate`.
- The logic is Kleene's: `all` fails if one fails, and is unknown if one is
  unknown and none fails; `any` and `one` likewise; `not` of unknown is
  unknown. A `cases` condition that's unknown gives the branch's result if
  it's the same as the rest's, and unknown otherwise. `contains` and
  `itemSequence` count what might pass as well as what does.
- **Marks** are sure (they're there if the schema passes) or might be. What
  an unknown subexpression marks, and what an unknown schema might mark
  (anything), might be. An `unevaluated` selector skips what's sure to be
  marked, and a property or item that might be marked can only make it
  unknown, not fail.
- A result also says whether it might annotate the value, and whether it
  marks part of it, which are effects for
  `keyword-implied-by-const-or-enum`.
- A keyword that wasn't lowered isn't evaluated, so it passes, and a value
  that couldn't be parsed passes every schema, as when validating.
