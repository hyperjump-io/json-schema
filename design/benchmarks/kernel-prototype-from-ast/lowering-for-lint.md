# Lowering for lint

First recorded 2026-10-23.

`lowerForLint` lowers a document without compiling or retrieving
([Lowering for lint](../../specs/kernel/lowering-for-lint.md)). `lint-check.ts` compares what
`analysis.ts` finds from the expressions with lint's tables, on 1,483
documents (the corpora and the test suites, 12,783 keyword groups):

| | Same as the table | Different |
| --- | --- | --- |
| Types a keyword applies to (`keywordType`) | 12,054 | 583 |
| Asserts on its own (`const-or-enum-assertions`) | 12,756 | 27 |
| References (`visitReferences`) | 1,016 | 0 |

- Types leave out the 146 `format` keywords, whose types the table doesn't
  have. Every type that differs is a keyword with no effect in its schema,
  which applies to nothing: 543 unknown keywords that aren't annotations,
  16 `uniqueItems: false`, 14 `additionalItems` without an array `items`,
  6 `properties: {}`, and 4 `required: []`.
- The assertions that differ are the same `uniqueItems` and `required`, and
  7 `dependencies` with only arrays of names, which do assert on their own.
  The list leaves `dependencies` out because it can have schemas.
- References first missed 4, in `definitions`, which has no `lower`. Lint
  parses every keyword by its shape now.
- The port of `contradictory-limits` passed the rule's 16 tests, and gave
  the same messages as the rule on every document, none of which has
  contradictory limits, and on broken documents.
- Lowering a document took 0.7–1.7 ms for `package.json` and
  `tsconfig.json`, and about 7 µs for a test case's schema.
