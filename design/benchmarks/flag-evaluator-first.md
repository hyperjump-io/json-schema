# Building the flag evaluator first

First recorded 2026-11-10, on Node.js 22.22.1, when `validator` and
`validatorFor` started building the evaluator for a value with FLAG output
when they make their function, instead of on its first call (see
[The kernel](../components/kernel/README.md)).

## Where a first pass went

In the `jsonschema-benchmark` harness, each schema's validator is made, then
its corpus is validated once ("cold"), then again until it's warm. Splitting
the cold pass into the first call and the rest, before the change, over 36
schemas (geometric means, in milliseconds):

| | Time |
| --- | --- |
| The first call, which optimized the kernel and built the evaluator | 5.56 |
| The rest of the cold pass | 2.18 |
| A second pass | 1.27 |

The first call was a median of 76 percent of the cold pass, from 15 to 95.
On `cql2` it was 18.3 milliseconds, and the other 108 instances took 0.9.

## Moving it

The same harness, every schema, the median of 3 runs each (geometric means
of 36 schemas, in milliseconds):

| | Before | Now |
| --- | --- | --- |
| Compile | 15.30 | 21.56 |
| Cold | 8.69 | 2.36 |
| Compile and cold | 24.48 | 24.88 |
| Warm | 0.30 | 0.30 |

The work moved: the two together didn't change beyond noise. The schemas
whose cold time changed most:

| Schema | Cold, before | Cold, now | Compile, before | Compile, now |
| --- | --- | --- | --- | --- |
| `ui5-manifest` | 34.77 | 8.43 | 82.3 | 108.2 |
| `cql2` | 17.81 | 1.71 | 25.5 | 39.4 |
| `vercel` | 14.38 | 2.23 | 18.0 | 29.1 |
| `ui5` | 16.10 | 4.21 | 37.3 | 49.2 |

The implementations it's compared with generate their code when they
compile, so their cold times never included it.
