# Unevaluated when annotating

First recorded 2026-10-26.

`static-unevaluated` ran only in fast mode. It's sound when annotating
without plugins too: it only needs the marks of a passing schema, and
annotating keeps a schema's annotations only if it passes. Now it runs
whenever there are no plugins.

None of the default corpora use `unevaluatedProperties` or
`unevaluatedItems`, so it was measured on OpenAPI 3.1 from
`jsonschema-benchmark` (`schema-noformat.json`, 107 instances), as a
corpora file for `ab.ts` (`CORPORA`). B/A, median of 15 rounds:

| | OpenAPI 3.1 |
| --- | --- |
| `annotate` | 0.787 (0.710–0.851) |
| `annotateNode` | 0.849 (0.818–0.869) |

`annotate` includes converting the value to an AST, which is why its
range is wider. `annotateNode` annotated the same nodes every round then,
so their annotations added up (see
[Evaluating ASTs](evaluating-asts.md)), which makes its number less
reliable than `annotate`'s.

The annotations were compared on every node, with A and B annotating the
instances and 10 mutants of each (a property removed or a value
replaced): 1,177 instances, 111 valid, no differences. With `except`
missing one of the names on purpose, the same script found 108
differences in 321 instances. `check-src.ts` found no differences.
