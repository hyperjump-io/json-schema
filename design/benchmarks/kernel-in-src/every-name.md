# An `except` that selects every name

First recorded 2026-11-12.

In `jsonschema-benchmark`, ata-validator's interpreted engine
(`engine: 'interpreter'`, no generated code) was faster than v2 on one
schema, `importmap`: 0.262 milliseconds against 0.306. `importmap` is
objects whose values all have to be strings,
`additionalProperties: { "type": "string" }` with no `properties` or
`patternProperties`, so the schema has one property operation, and
`fast.js` builds it as an `eachProperty` instead of a property loop. Its
selector is an `except` of no names and no patterns, but `eachProperty`
still called it for each name, a `Set`'s `has` and an empty array's
`some`, before the value's check. ata-validator's loop has no test of the
name there.

`fast.js` now builds an `eachProperty` whose `except` has no names and no
patterns as a loop that doesn't test the name. `ab.ts` FLAG, B/A, against
HEAD, on Node 22.22. Corpora are `jsonschema-benchmark`'s 37 schemas with
their instances, and the usual ones, each corpus in a process of its own:

| | B/A | | B/A |
| --- | --- | --- | --- |
| `draft-04` | 0.773 | `importmap` | 0.818 |
| `package.json` | 0.906 | `cmake-presets`, `fabric-mod`, `jsconfig`, `jshintrc` | 0.93 |
| OpenAPI (`openapi`) | 0.942 | `deno`, OpenAPI 3.0, `code-climate` | 0.95–0.97 |
| `ui5-manifest` | 1.033 | Others | 0.97–1.01 |

- A copy of `fast.js` that counted them found that 18 of the 37 schemas
  build such an `eachProperty`, and 8 evaluate it often. `ui5` and
  `ui5-manifest` build them and never evaluate them, so their 1.010 and
  1.033 are noise. `geojson` doesn't have one and was 0.959.
- A loop over `Object.keys` with an index, as ata-validator's is, instead of
  `for...in`, was slower. Through `jsonschema-benchmark`'s Node 23 image,
  every loop in `fast.js` written that way took 1.28 times as long by
  geometric mean, and was slower on 30 of the 37 schemas (`jshintrc` 2.5,
  `omnisharp` 1.8, `stale`, `nest-cli`, and `deno` about 1.5).
- `ab-equal.ts` with ten mutants for each instance found no differences on
  any corpus. The test suites caught each of three mistakes made on
  purpose (6 to 44 failing tests): values that aren't checked, names that
  aren't marked, and a value that isn't an object failing.
