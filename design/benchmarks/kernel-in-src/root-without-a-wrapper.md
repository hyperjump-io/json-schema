# The root without a wrapper

First recorded 2026-10-28.

`fast.js` wrapped its root evaluator in a function that saved the dynamic
scope, cleared it, and restored it in a `finally`, so an evaluation started
inside another one doesn't lose the outer one's scope. Only a kernel that
reads the dynamic scope sets it, so for any other kernel there's nothing to
save, and the evaluator is now the root, called without marks.

On yamllint in `jsonschema-benchmark`, whose kernel is one `property`
operation, the wrapper was about a fifth of the time. In the container
(`node:23.7.0-alpine3.21`, ms for a run of the corpus once it has run 400
times):

| | Before | After |
| --- | --- | --- |
| yamllint | 0.015 | 0.012 |
| aws-cdk | 0.027 | 0.026 |
| semantic-release | 0.097 | 0.094 |

On all 36 schemas, the geometric mean was 0.985 times (0.67 to 1.14), and
validation results are the same on every schema. helm-chart-lock (1.14)
and pre-commit-hooks (1.08) were noise: four more runs of each were 0.51–
0.69 ms against 0.53–0.62, and 0.33–0.35 against 0.33–0.36.

- yamllint is still about 4.7 times corvus-ts in `jsonschema-benchmark`,
  but mostly because of warming up. A run of its corpus takes 0.015 ms, so
  the harness's 100 runs before the one it times are about 3 ms, and V8
  hasn't finished optimizing: the 101st run is 0.024–0.027 ms, and it's
  0.014 from about the 500th. corvus-ts's harness runs it 1,000 times.
- Checking an item against two types with a `typeof` for each, in place
  of `typeIndex` and a mask (semantic-release's `plugins` items, a string
  or an array), was slower: 0.097 to 0.11 ms.
