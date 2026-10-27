# Evaluating ASTs

First recorded 2026-10-26.

The language server evaluates ASTs, with plugins and annotating, so
`instrumented.js` on ASTs is the path it depends on. Before these changes,
on small `package.json` files (1,472 instances, ms for all of them, one
run):

| FLAG | A plugin with every hook | AST, no plugins | AST, every hook | Annotating an AST |
| --- | --- | --- | --- | --- |
| 1.00 | 4.40 | 5.34 | 6.64 | 8.71 |

An AST without plugins (`validateNode` or `validateJson` with FLAG) took
about as long as one with plugins, five times as long as FLAG, because
`instrumented.js` evaluated it without stopping early.

`ab.ts` got `node`, `nodeHooks`, and `annotateNode`, which evaluate ASTs
parsed beforehand, so parsing isn't timed. B/A, median of 15 rounds:

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| `entries` as an array, every hook | 0.896 | 0.963 | 0.789 |
| `entries` as an array, no plugins | 0.872 | 0.945 | 0.786 |
| Stopping early, no plugins, after `entries` | 0.950 | 0.710 | 0.846 |

- A CPU profile of `package.json` ASTs with every hook put 12.8% in
  `astInstance.entries`, a generator. It builds an array of the entries
  now. Unlike `jsInstance.entries` (see
  [Evaluating with plugins and annotating](plugins-and-annotating.md)),
  that time was the generator itself.
- Without plugins or annotating, only the result and marks can be seen,
  so `instrumented.js` stops early where `fast.js` does: a schema at its
  first failing group, `any` at its first passing subexpression when
  nothing reads marks, and `eachItem` at its first failing item. Most of
  the instances are valid, so most of the gain is `any`. `check-src.ts`
  found no differences.
- With both changes, converting an AST without error nodes to its value
  (`jsonValue`) and evaluating that with `fast.js` was faster on small
  instances (`tsconfig.json` 0.71 to 0.29 ms, OpenAPI 0.63 to 0.13 ms) but
  slower on `package.json` (15.2 to 17.7 ms on medium files, 0.58 to
  2.01 ms on large ones): converting cost about as much as evaluating. It
  isn't used.
- An index of each AST object's property names, so `has` and `get`
  aren't searches of its properties, was 1.01–1.09 times as long, built
  for objects of 8 or more properties or for every object, cached by node
  in a `WeakMap`. Lookups are rare: in one run on medium `package.json`
  files, `has` and `get` were about 1,650 lookups that looked at 2.6
  properties each, against about 15,800 calls of `entries`. The merged
  property loop finds properties for nearly every schema, and the
  required bits cover `required` next to two property groups. It isn't
  used.
- `oneOfValues` in `instrumented.js` compared the instance with each value
  through `instanceEqual`. It looks scalars up in a set now, as `fast.js`
  does. B/A, median of 15 rounds:

  | | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
  | --- | --- | --- | --- |
  | AST, every hook | 0.981 | 0.814 | 0.946 |
  | Annotating an AST | 0.978 | 0.862 | 0.998 |
  | Plain value, every hook | 0.999 | 0.821 | 0.992 |

  `tsconfig.json` has enums of dozens of values, like `lib` and `target`.
  A `Set` compares scalars as `===` does except for `NaN`, which JSON
  doesn't have.
