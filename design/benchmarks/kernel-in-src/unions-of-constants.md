# Unions of constants, and nullable type switches

First recorded 2026-11-18.

`jsonschema-benchmark` added 20 schemas. Its new worst for v2 against the
fastest implementation were `changesets` (4.5×), `railway` (3.7×), `biome`
(2.95×), and `prometheus` (2.9×). `biome` is written by a Rust schema
generator. It has 2,102 `anyOf`s and `oneOf`s whose schemas are only
`const`s or `enum`s, maybe with a `type` (`{ "type": "string", "const":
"error" }`), and 835 nullable references, `anyOf` of a `$ref` to a `oneOf`
and `{ "type": "null" }`. A profile of its warm passes had 30% of the time
in `any`'s own evaluator. `dispatch.js` left unions of constants alone,
because their schemas are cheap ([`dispatch.js`](../../components/kernel/optimizations/dispatch.md)).
Each one was still a call for each constant.

`dispatch.js` now does two more rewrites, both only in `fast`:

- An `any` or `one` of expressions that only pass some scalars is a
  `oneOfValues` of them, for `one` the values only one of them passes. A
  `typeIs` beside the values leaves out the values without the type, and
  `null` and `boolean` alone are their values, so `anyOf` of an `enum` and
  `{ "type": "null" }` is one too. With plugins, the error would be the
  `anyOf`'s instead of each constant's, so it's left as it was there.
  `ab-equal.ts` found those as the only differences before it was limited
  to `fast`: 43 errors with five mutants for each instance, and no results.
- An `any` of one `typeSwitch`, maybe through schemas whose only group
  with an effect is one, and expressions that only check the type, is a
  `typeSwitch` where those types `pass`. Before, a `null` was dispatched
  by the switch, failed, and was then checked. It's left when anything
  reads marks, which the switch could make for an instance the types
  pass, or the dynamic scope.

`ab.ts` FLAG, B/A, against HEAD, on Node 26.3. Corpora are
`jsonschema-benchmark`'s 56 schemas with their instances (all but
`openapi-schema-base`, which needs the OpenAPI vocabulary):

| | B/A | | B/A |
| --- | --- | --- | --- |
| `biome` | 0.595 | `changesets` | 0.953 |
| `railway` | 0.909 | `cspell` | 0.962 |
| `prettier` | 0.914 | `gitlab-ci` | 0.967 |
| Geometric mean of 56 | 0.987 | Others | 0.96–1.02 |

- In steps: constants alone made `biome` 0.65, with `null` 0.61, and the
  `typeSwitch` 0.91 of that.
- `lerna` was 1.139 in the sweep, with the same kernel as before. Alone,
  with 21 rounds, it was 0.996, and `cql2`, `krakend`, and `aws-cdk`
  (1.04 in the sweep) were 0.99–1.01.
- `ab-equal.ts` with three mutants for each instance found no differences
  on any of the 56.

Rejected: comparing a scalar `const` or `enum` in `fast.js`'s `property`
evaluator instead of calling the value's evaluator, for conditions like
`prometheus`'s six `if`s of `"basic_auth": { "const": null }` and `ui5`'s.
It was 0.995 by geometric mean, `prometheus` 1.013 and `ui5` 0.967: V8
already inlines the call.
