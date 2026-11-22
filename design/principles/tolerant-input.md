# Be tolerant of bad input

When bad input can be recovered from, the resolver accepts it, the same way
in every dialect, and the linter reports it. Refusing a schema that can be
understood helps no one.

- A spec MUST that the implementation recovers from is lint, at `error` in
  `recommended`, not validity. A v1 `$schema` with a fragment, or that
  isn't normalized, still finds v1, and `invalid-dialect-uri` reports it
  (see [Validity and lint](../components/lint/validity.md)).
- What makes a schema unusable is validity, and it's always checked.
- Before turning a MUST into a keyword check or a resolver error, ask
  whether the implementation already recovers. If it does, it's a lint
  rule.
- What the resolver accepts and what stays an error is in
  [Schema validation](../components/schema-validation.md).
