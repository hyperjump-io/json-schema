# The suite tests what keywords mean

What a keyword means, as the spec defines it, is tested by
[JSON-Schema-Test-Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite),
and unit tests test what the suite can't say. The suite is shared with
every other implementation, so a case there is checked against all of
them, and a unit test that repeats one only has to be kept in step with
it.

- The suite runs for every dialect in
  `src/dialects/*/json-schema-test-suite.test.js` and
  `annotation-test-suite.test.js`, through `test/test-suite.js`. A case
  that's skipped says why next to it.
- A unit test doesn't repeat a suite case. Dialect tests had cases like
  "`$ref` replaces the whole schema" and draft-04's boolean
  `exclusiveMaximum`, which the suite runs for those dialects, and they
  were removed.
- Spec behavior the suite doesn't have is proposed upstream. Until it's
  merged, it's kept here in the suite's format, run by the same runner,
  and removed once the suite has it.
- Unit tests are for the library's own behavior: schema problems and
  their places, messages, config like `validateFormats`, output formats,
  lint, and the API. They're also for the contract of an internal
  function whose edge cases depend on how it's implemented, like
  `multipleOf(divisor)` in `src/kernel/fast.test.js`, which tests decimal
  arithmetic (`0.3` by `0.1`, `2 ** 60` by `3`, quotients that overflow),
  not what `multipleOf` means. Results like these are partly up to the
  implementation, so they aren't proposed upstream.
- Rejected: v1's rule that keyword behavior is only tested through the
  suite (a contributor's `multipleOf.spec.ts` was dropped for it in v1's
  PR #140). It left no place for arithmetic edge cases the suite doesn't
  and shouldn't have.
