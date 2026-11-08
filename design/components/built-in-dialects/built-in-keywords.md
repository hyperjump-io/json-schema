# Built-in keywords

- The v1 dialect (`src/dialects/v1`) includes the `propertyDependencies`
  proposal, and `conditional`, `itemPattern`, and `requireAllExcept` under a
  comment, because they aren't full proposals yet.
- Equality (`const`, `enum`, `uniqueItems`) compares through `InstanceOps`,
  so an AST isn't copied. A value that couldn't be parsed counts as equal
  for `const` and `enum` and as different for `uniqueItems`, so it never
  causes an error of its own.
- Keywords that depend on a sibling (`additionalProperties`, `items`,
  `contains`, and `if`) read it from the schema AST when they're compiled.
  `then`, `else`, `minContains`, and `maxContains` have no effect on their
  own.
- Compiled maps of schemas are `[name, handle]` pairs because a name like
  `__proto__` can't be a property of a plain object.
- The meta-data and content keywords are annotations. `contentEncoding`,
  `contentMediaType`, and `contentSchema` only annotate strings, and
  `contentSchema` only annotates if there's a `contentMediaType`. Content
  isn't decoded or validated.
- `multipleOf` treats numbers as the decimals they're written as, and is
  exact (`multipleOf` in `src/kernel/fast.js`). JSON numbers are
  decimals that floating point can't always represent, so `0.3` divided by
  `0.1` is a little less than 3. Instead, both numbers are scaled by a
  power of ten to integers with as many decimal places as the divisor,
  which is exact while they're below 2^50. The integers are divided with
  `%`. The divisor's scale is found when the evaluator is compiled, so a
  value takes 5–15ns, about what a tolerance took. Larger numbers compare
  their shortest decimals as `BigInt`s, which takes about 0.5µs.
- The decimal is the shortest one that parses to the same float. A number
  written with more than about 17 significant digits has already lost
  them when it's parsed.
- Rejected: v1's fixed tolerance of 1.19e-7 for the remainder. It's larger
  than a small divisor like 1e-8, so every number was a multiple of it.
  Scaling that tolerance by the divisor isn't enough either: the
  remainder's error grows with the value, so a large integer wasn't a
  multiple of 1e-8.
- Rejected: a tolerance relative to the quotient. No tolerance is right
  for every size. Once the quotient is around 1e15 the tolerance reaches
  0.5, so `1e16` was a multiple of `3.3`. A quotient that overflowed, like
  `1e300` divided by `1e-10`, wasn't a multiple.
- Rejected: always comparing as `BigInt`s. It's exact, but it takes about
  0.3µs because it goes through strings, and scaled floats are exact
  for almost every number a schema has.
- In v1, `$dynamicRef` is the name of a dynamic anchor, not a URI. It uses
  the outermost schema in the dynamic scope with that anchor, with no
  lexical fallback. If none is in scope, evaluation throws, because that's
  a problem with the schema, not the instance.

