# Meaning comes from the kernel

What a keyword means is what it lowers to. The optimizer, lint, and the
output formats only read kernel expressions, never keyword URIs, so a
user's keyword is optimized, linted, and reported like a built-in one (see
[the kernel spec](../specs/kernel/README.md)).

- No tables of keyword URIs. Before the kernel, the passes, lint, and the
  output formats each had one, and a custom keyword was in none of them.
- No facts on keyword definitions that only one tool reads, like
  `Keyword.default`. If a tool needs to know something about a keyword that
  its expression doesn't say, the kernel is missing an operation.
- Lint rules are built on the operations directly, not on a derived summary
  of what a schema allows. Users write rules too, and they'd have to learn
  the summary, and a summary might not cover custom keywords. Shared lint
  machinery is generic over operations, like `appliesTo` and
  `evaluatorForLint`.
- A keyword's syntax is still declared (`shape`, `siblings`), because tools
  need it before lowering, on documents that may be broken. A rule about a
  particular keyword's syntax, like `then-else-without-if`, names it.
