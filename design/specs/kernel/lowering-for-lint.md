# Lowering for lint

Lint runs without compiling, so it lowers each document itself, in the
normal form, without compiling or retrieving anything
(`LintDocument.schemas`, lowered in `src/lint/document.js`, which shares
`lowerKeywords` with compiling). `lowerKeywords` is asynchronous, and it
reads a schema the way its inputs say (`Reader`). A document's schemas are
read as targets, as compiling reads them, with browser's step functions
and `reference: "manual"`, so nothing is followed. A schema a rule makes
from other schemas' keywords isn't in a document, so it's read as nodes
(`nodeReader`):

- A subschema is `apply` of its location, and a reference is `apply` of
  the URI it resolves to. The dynamic anchors of a resource in the
  document are known. A dynamic reference into a document that isn't
  retrieved can't be decided, so lint lowers it to `dynamicApply`, which
  can only overstate which schemas might apply.
- A keyword whose value can't be lowered, like one that doesn't fit its
  shape in a broken document or one its keyword's `check` rejects
  (`"maximum": "x"`, because shape `"data"` fits anything), has no group,
  and such a sibling is left out. Lint reports the value.
- Every keyword's value is parsed by its shape, including keywords without
  `lower`, so the references in `definitions` are found too.
- Each group keeps its keyword's node and its sources' nodes, for where
  messages go.
- **Where each operation came from.** A keyword is lowered again without
  each sibling it read that's in the schema, and the expressions are
  compared. A field that's different without a sibling came from the
  sibling (draft-04's `exclusiveMaximum` for `range`'s `exclusiveMax`,
  `minContains` for `contains`' `min`). An operation that isn't there
  without it came from the keyword and the sibling (`if` and `then` for
  the `apply` of `then`'s schema), and so did everything if the keyword
  can't be lowered without it. The rest came from the keyword. A sibling
  with its default value lowers the same as without it, so nothing came
  from it. Rules ask with `cameFrom(operation, field?)`, so they don't
  depend on the order a keyword declares its siblings.

What lint knows from the expressions (`src/lint/analysis.js`: `appliesTo`,
`keywordAppliesTo`, `canPass`, `assertsOnItsOwn`):

- **The types a keyword applies to** are the types on which it can fail,
  mark, or annotate. A `cases` only applies where its condition can pass,
  which is why conditions say their type. A keyword with no effect in its
  schema (`uniqueItems: false`, `properties: {}`, an unknown keyword that
  isn't an annotation) applies to nothing. A sibling applies to what the
  keywords that read it apply to (draft-04's `exclusiveMaximum`). This
  replaced `keywordType`.
- **Whether a keyword asserts on its own**: it has an operation that can
  fail without a schema, and applies none. This replaced
  `const-or-enum-assertions`' list.
- **References** are the inputs of the `"reference"` shape and the schemas
  that are references. This replaced `visitReferences`' keyword URI.

In the prototype, these agreed with the tables they replaced on every
keyword in the corpora and the test suites, except where the kernel knows
more ([Lowering for lint](../../benchmarks/kernel-prototype-from-ast/lowering-for-lint.md)). `contradictory-limits` reads
`range`, `stringLength`, `itemCount`, `propertyCount`, `contains`, and
`hasProperty`, without naming a keyword. It also finds v1's
`requireAllExcept` with too small a `maxProperties`, which the rule before
the kernel missed. A rule about a particular keyword's syntax
(`then-else-without-if`) still names it. Which rules do is in
[Rules](../../components/lint/rules.md).
