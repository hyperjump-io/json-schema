# Testing

- The JSON-Schema-Test-Suite's `unify` branch (which will replace `main`)
  runs for every release: v1 (the suite's `9999`), 2020-12, 2019-09, and
  draft-04 through draft-07, each in its directory's
  `json-schema-test-suite.test.js`. v1 also runs the suite's proposal
  tests.
- One config runs every test case of a release. Each test case's
  schema and `externalSchemas` are in a session registry, which keeps test
  cases from seeing each other's schemas, and `http(s):` is removed so
  nothing is retrieved. Each test is checked as a value, as JSON
  text, with BASIC, and annotated. Test cases tagged
  `format-assertion` run with `validateFormats`.
- The suite's annotation tests run in each directory's
  `annotation-test-suite.test.js`, annotating values and JSON text. Only
  annotation values are compared, in any order, because annotations don't
  record the schema they came from.
- The runners share `describeValidationTestSuite` and
  `describeAnnotationTestSuite` in `test/test-suite.js`. Each one gives the
  release, the dialect, the config to use, and what to skip. The
  annotation runner gets the dialect itself, because the suite names
  keywords and annotations are identified by keyword URI.
- Tests for `conditional`, `itemPattern`, and `requireAllExcept` are in
  `src/dialects/v1/extension-tests`, ported from v1 except for
  `requireAllExcept`, which v1 didn't have tests for.
