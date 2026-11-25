# Implication and exclusion (`src/kernel/implies.js`)

`implies(schemas)(a, b)` says whether every instance that passes the
expression `a` passes `b`. Lint's `redundant-all-of-any-of-schemas` and
`covered-one-of-schemas` read it. It's in the kernel because it's about what expressions mean, and
knows nothing about documents.

- **`true` is sure, and `false` is "not known".** It never evaluates
  anything, so it only knows what the expressions say. What it knows is
  in its JSDoc.
- **It's about the result only.** An expression that implies another can
  still mark or annotate what the other doesn't, so whoever leaves one out
  has to check that too. An operation that only annotates always passes,
  so everything implies it.
- **`schemas` is a table**, each handle with the expressions of its keyword
  groups, not the kernel or a lint document. Lint and an optimization have
  different ones, and the comparison only needs what a schema says.
  `false` is `fail`, and `true` is no expressions. A schema that isn't in
  the table implies only itself.
- **Each limit is compared on its own**, so limits from two keywords imply
  an operation with both, like `minimum` and `maximum` in one `range`.
- **Values are checked against operations**, for `equals` and
  `oneOfValues`, where an operation needs no schema: types, other values,
  limits, and an object's properties. So `enum: ["a", "b"]` implies
  `type: "string"` and `maxLength: 1`.
- **What depends on more than the instance doesn't imply itself**: an
  `unevaluated` selector, `dynamicApply`, and `opaque`. The same
  expression in two places can have different results.
- **Operations' domains** (`domains` in `kernel.js`) are how a `typeIs`
  implies an operation that doesn't apply to its types. The table was
  lint's, in `analysis.js`.

## Exclusion

`excludes(schemas)(a, b)` says whether no instance passes both `a` and
`b`, with the same table and the same answer: `true` is sure. It's
`implies(a, not b)`, so the two are built together, and `implies` asks it
what implies a `not`.

- **It's decided for each type of instance.** An operation passes every
  instance it doesn't apply to, so `maximum: 3` and `minimum: 5` both pass
  a string, and don't exclude each other. Two expressions do if, for each
  of the six types, one of them can't pass it or what they say about it
  can't both hold. What they say about a type is in `excludes`' JSDoc.
- **Each side is everything that has to pass**: what's in its `all`s and
  the groups of the schemas it applies, as one list. Then a `type` in one
  keyword and limits in another are seen together, which the per-type
  decision needs, and `implies`' "one part is enough" doesn't.
- **A side's own limits count**, so `minimum: 5` with `maximum: 4` and a
  `type` excludes everything. `excludes(a, pass)` is "nothing passes
  `a`".
- **A property decides if one side requires it**, so schemas with
  different `const`s for a required property exclude each other, which is
  the tag `dispatch` finds. `propertyEquals` is read as requiring the
  property and its value being equal.
- **`not`** on one side is excluded by whatever implies its expression,
  for the type. The two functions call each other through `not`, to a
  depth of 16.
- **A schema that applies itself in an `any` or `one` is left out there.**
  Each expression of an `any` or `one` is a side of its own, made knowing
  which schemas' groups it's already in, and it doesn't add those again.
  Leaving out something that has to pass only makes less known. The depth
  doesn't stop this, because nothing is compared on the way down.

## Ruling pairs out

Comparing every pair of a long `anyOf`'s schemas takes time that grows
with the square of how many there are. `overlapping(schemas)(expressions)`
says, for each one, which of the others it might pass an instance with,
and `comparable` which it might imply or be implied by. Lint compares
only those.

- **A pair that's ruled out is sure to exclude each other**, so it's
  never one that `excludes` doesn't know about, and neither implies the
  other unless nothing passes it.
- **Each expression gets keys**: the types it can pass, the values it
  allows, or the values it allows for a property it requires. Two with
  keys of the same kind and none in common are ruled out. A value's key is
  its JSON with properties in order, so equal objects have the same one.
- **One kind of key is used for a list**, the one that leaves the fewest
  pairs, so the expressions go in buckets and nothing is compared to find
  the pairs. Rejected: ruling a pair out by any kind, which is a test for
  each pair again.
- **An expression without a key is compared with every other one**, and
  so is one that nothing passes as far as its keys say, like two `const`s
  in an `allOf`. That one implies everything, which `implies` might know.
- **A property's values are keys for `overlapping` only if nothing but an
  object passes**, because two schemas with different values for a
  required property both pass a string. For `comparable`, it's enough
  that an object can pass: one that passes the first fails the second.
- **Checked on 2026-11-24**: the three rules report the same 2,274
  messages on the 73 documents of the benchmark corpora with it and
  without, and in 150,000 random lists of expressions, no pair that was
  ruled out passed the same instance or was implied.

Lint's `exclusive-one-of-schemas` reads `excludes`. Counted on the 39 schemas of the
benchmark corpora, with what it knows now:

- **Contradictions**: no `allOf` whose schemas exclude each other, and 2
  schemas whose own keywords do (`type: "integer"` with `enum: [{}]`),
  which `const-or-enum-value-for-disallowed-type` reports.
- **`oneOf`s whose schemas all exclude each other**: 94% of them, before
  optimizing. After the `fast` optimizations, 516 `one`s are left, mostly
  in the branches of `dispatch`'s switches, and 211 of them are exclusive:
  197 in `cql2`, 6 in `geojson`, 5 in `ui5-manifest`, 2 in
  `package.json`, and 1 in OpenAPI 3.0. An exclusive `one` could be an
  `any`, which stops at the first that passes instead of trying the rest.
  That was tried and isn't used
  ([An exclusive `one` as `any`](../../benchmarks/kernel-in-src/exclusive-one.md)).

## Rejected

- **Evaluating instead**, like `keyword-implied-by-const-or-enum` does for
  values. Implication is about every instance, and there's no finite set
  of them to try except for `equals` and `oneOfValues`.
- **Taking a pair of schemas that's being compared to imply**, which would
  find that two schemas that apply themselves the same way imply each
  other, as `sameExpression` does for schemas that are the same. A result
  found from that assumption can't be kept if the assumption turns out
  wrong, so every result would have to remember what it assumed.

- **An optimization that leaves out what's implied**: an expression of
  `any` that implies another, and an expression of `all` that another
  implies, where the marks and annotations allow. In `fast`, `any`
  already stops at the first that passes, so it would only be worth what
  `combine` and `dispatch` could do afterwards, and every first
  `validate` would pay for the comparison. The 49 schemas of the
  benchmark corpora have 44 such expressions, all in `anyOf`, 30 of them
  from one mistake in one schema.

## Open questions and limitations

- **`excludes` doesn't know** `hasProperty` against an `eachProperty` that
  rejects the name, a pattern against a value's string, `integer` against
  a `range` with no integer in it, or `multipleOf`.

- **The dynamic scope.** A schema that both expressions apply is taken to
  have the same result in both. One that reads the dynamic scope could be
  applied through different resources. An optimization would have to leave those schemas out (`kernel.reads`).
- **`any` in `b` needs one of its expressions to be implied**, so
  `type: ["string", "number"]` isn't known to imply `anyOf` of the two
  types.
- **`multipleOf`, `matches`, `contains`, and the switches** imply only
  themselves. A multiple of 4 is a multiple of 2, but only as decimals.
- **`eachProperty`** is only compared with the same selector.
