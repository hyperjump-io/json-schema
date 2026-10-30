# Files

- A keyword's or format's path mirrors its URI.
  `https://json-schema.org/keyword/draft-2019-09/items` is
  `src/keywords/draft-2019-09/items.js`. A variant is named after the last
  draft that uses it, so draft-04 uses `draft-2019-09/items`.
- One thing per file where the file structure says what exists: a lint
  rule per file in `src/lint/rules/`, and an optimization pass per file in
  `src/kernel/optimizations/`, with `index.js` listing them in the order
  they run.
- Tests are next to the code they test.
- A built-in dialect's directory has its dialect and its tests, including the test
  suite runners.
