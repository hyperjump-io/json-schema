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
- When something reads marks, `instrumented.js` copied what was marked so
  far for every keyword group of a schema and every subexpression of
  `any`, `one`, and a condition of `cases`. Now one that can't mark the
  instance gets nothing, one that marks gets an empty set, and only one
  that reads marks gets a copy. Whether a schema can mark is worked out
  once for each schema. On OpenAPI 3.1 (see
  [Unevaluated when annotating](unevaluated-when-annotating.md)), B/A,
  median of 21 rounds:

  | | OpenAPI 3.1 |
  | --- | --- |
  | AST, every hook | 0.917–0.935 |
  | Plain value, every hook | 0.913 |
  | Annotating an AST | 0.981 |

  Annotating gains little because `static-unevaluated` already leaves
  most schemas without anything that reads marks. The corpora that don't
  read marks were 1.026–1.035 with the new mode looked up on every
  subexpression of `any` and `one`, and 0.986–1.017 when it's only looked
  up if there are marks, against 0.950–0.991 for two copies of HEAD.
  `ab-equal.ts` with 10 mutants of each instance and the annotation
  comparison found no differences, and `check-src.ts` found none. With
  `property` said not to mark on purpose, `ab-equal.ts` found 782.
- Annotations were collected in nested lists: one for each group that
  annotated, added to one for its schema if the group passed, added to
  the caller's if the schema passed, and flattened when they were
  attached. Each annotation was an object. Now they're one flat list for
  the evaluation, three items for each annotation, and a schema that
  fails cuts the list back to its length when it started. A group doesn't
  have to: a schema fails if any of its groups fails. B/A, median of 21
  rounds:

  | | `package.json` | `tsconfig.json` | OpenAPI 3.0 | OpenAPI 3.1 |
  | --- | --- | --- | --- | --- |
  | `annotate` | 0.862 | 0.861 | 0.818 | |
  | Annotating an AST | 0.849 | 0.815 | 0.774 | 0.990 |
  | AST, every hook | 1.001 | 1.024 | 1.006 | |

  - Cutting the list back on every failure, even when it was already
    that long, made `annotate` on `tsconfig.json` 1.065 and OpenAPI 3.1
    1.03–1.05: setting an array's length is a call into the runtime, and
    `tsconfig.json`'s schema has many branches that fail without
    annotating. It's only set when the list is longer.
  - Without annotating, the first version still read the list's length
    for every group and schema, and set it on every failure, which made
    evaluating with every hook 1.03–1.23. Neither is done without
    annotating now.
  - OpenAPI 3.1 has few annotations (1,690 on its 107 instances, against
    73,870 on `package.json`'s 3,000), so it doesn't change.
  - Until this change, `ab.ts`'s `annotateNode` annotated the same nodes
    every round, and annotating a node again adds to its annotations, so
    their lists grew. It clears them before each run now. Its earlier
    numbers in this note and in
    [Unevaluated when annotating](unevaluated-when-annotating.md) are less
    reliable than `annotate`'s.
  - The annotations of every corpus and OpenAPI 3.1 were compared on
    every node (values in order), on the instances and 5 mutants of each:
    19,854 instances, no differences. Without the cut, the same script
    found 1,599 differences in 6,618 instances (one mutant each).
    `check-src.ts` found no differences.
- `uniqueItems` in `instrumented.js` compared every pair of items. It
  buckets long arrays now, as `fast.js` does
  ([Unique items](unique-items.md)), through `InstanceOps`. On
  `jsonschema-benchmark`'s Unreal Engine `.uproject` schema and its 859
  instances (as a `CORPORA` file), B/A, median of 21 rounds:

  | | `.uproject` |
  | --- | --- |
  | Plain value, every hook | 0.450 |
  | AST, every hook | 0.529 |
  | Annotating an AST | 0.789 |

  The default corpora were 0.978–1.008 with every hook. `ab-equal.ts`
  with 20 mutants of each `.uproject` instance found no differences, and
  `check-src.ts` found none.
- An AST without plugins or annotating took about 4.5 times as long as
  FLAG on the plain value on `package.json` and 6.5 times on GeoJSON (from
  `jsonschema-benchmark`, as a `CORPORA` file). A profile put 20% in each
  schema's evaluator, which saved and restored evaluation state and called
  hooks on an empty plugin for every schema and group, and about 25% in
  the property loops. Without hooks, nothing is between one group and the
  next, so a schema whose groups don't read marks is now one `all` of its
  groups' expressions, as in `fast.js`, and `all` stops at the first
  failure. Schemas whose groups read marks evaluate as before, which
  `static-unevaluated` makes rare without plugins. Then, B/A against the
  step before, median of 15 or 21 rounds, ASTs without plugins:

  | | `package.json` | `tsconfig.json` | OpenAPI 3.0 | GeoJSON | `.uproject` | OpenAPI 3.1 |
  | --- | --- | --- | --- | --- | --- | --- |
  | One `all` for each schema | 0.773 | 0.589 | 0.668 | | 0.804 | 0.684 |
  | Properties from an AST object's children | 0.885 | 0.970 | 0.918 | | | |
  | Property type masks, merged array checks | 0.983 | 0.877 | 1.009 | 0.897 | 0.973 | 1.024 |
  | All of it, against HEAD | 0.693 | 0.535 | 0.617 | 0.664 | 0.682 | 0.630 |

  - Reading an AST object's properties from its children instead of
    `entries`, which makes an array of pairs for each object, is also used
    with plugins in `buildAll`'s loops: with every hook, 0.951–0.991 on
    the default corpora. In the matcher that finds each group's
    properties, it was mixed (0.967–1.036 with every hook on ASTs,
    0.980–1.029 on plain values), so the matcher still uses `entries`.
  - A property schema that only checks the type is checked in the loop
    with a mask, as in `fast.js`, which gained 7–9% on `tsconfig.json` and
    nothing on the others. An item schema that only checks the type,
    checked in `eachItem`'s loop the same way, made GeoJSON 4–5% slower
    (A/A 1.002), so it isn't done: V8 had already inlined the call. A
    schema's `typeIs` of `array`, `itemCount`, and `eachItem` as one
    evaluator, which tests whether the instance is an array once, made
    GeoJSON 10% faster.
  - Against HEAD, with every hook: ASTs 0.929–1.012, plain values
    1.004–1.012, `annotate` 0.933–0.997.
  - `ab-equal.ts` with 10 mutants of each instance found no differences
    on any of the six corpora, and `check-src.ts` found none. The test
    suites evaluate every case with `validateJson` too, and caught each of
    three mistakes made on purpose (6, 38, and 66 failing tests): ignoring
    `maxItems` in the merged array checks, ignoring the first item's
    failure, and a type mask that always passes. The corpora's mutants
    don't change array lengths, so `ab-equal.ts` didn't catch the first.
