# Optimizations

First recorded 2026-10-23.

Measured with one-off scripts that time FLAG `validate` on the test suite
(every test case v2 gets right without remote schemas, test cases tagged
for `format` left out) and on the real-world corpora, comparing the code
before and after back to back (mean time per run, the median of 15–30).

Static `unevaluated*` (see [Optimizations](../components/kernel/optimizations/README.md)):

| | Before | After |
| --- | --- | --- |
| v1 suite | 0.195–0.208 ms | 0.164–0.173 ms |
| 2020-12 suite | 0.198–0.210 ms | 0.168–0.175 ms |
| draft-07 suite | 0.053 ms | 0.051–0.054 ms |
| `package.json` (draft-07) | 17.3–17.6 ms | 17.3–17.7 ms |

- It's about 15% faster on the v1 and 2020-12 suites, where
  `unevaluatedProperties.json` and `unevaluatedItems.json` were a third of
  the time. It resolves the `unevaluated*` keywords of 55 of the 70 2020-12
  test cases that have them. The rest depend on the instance (`anyOf`,
  `if`, `oneOf`, `dependentSchemas`, `contains`, `$dynamicRef`).
- The real schemas don't use `unevaluated*`, so they don't change.

Inlining `$ref` and `allOf`, with `package.json` and `tsconfig.json`
changed to 2020-12 so `$ref` is a keyword:

| | Before | After |
| --- | --- | --- |
| `package.json`, FLAG | 17.4–17.7 ms | 17.1–17.2 ms |
| `tsconfig.json`, FLAG | 0.570–0.580 ms | 0.557–0.558 ms |
| `package.json`, first `validate` | 7–8 ms | 13–15 ms |
| `package.json`, keywords | 10,032 | 13,405 |

- Compiling `package.json` takes 86 ms, and the pass took 6.6 ms, most of
  it copying and iterating the IR's schemas. Copying it with a spread
  takes 1.6 ms and `Object.keys` 0.5 ms. It isn't used.
- A CPU profile of FLAG on the draft-07 corpora: `jsInstance.entries`
  (`Object.entries`) is 35% of the time, `properties` 13%, and `type` 8%.
