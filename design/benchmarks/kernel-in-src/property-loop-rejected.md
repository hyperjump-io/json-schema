# What the property loop doesn't do

First recorded 2026-11-10.

corvus-ts was about 3.7 times as fast as v2 on `ui5` in
`jsonschema-benchmark`. It generates code: its object loops switch on a
name's length, compare names with `===`, and check a value that only has
to be one of some scalars inline (`v === "extension"`). Two of those were
tried in `fast.js`'s property loop. Neither is done. `ab.ts` FLAG, B/A,
against HEAD, on Node 22.22.

## Names by length

Names in buckets by their length, compared with `===`, instead of looked up
in the object of entries. Slower: `ui5` 1.071, `vercel` 1.136, `package.json`
1.107, `ansible-meta` 1.051. V8's lookup of an interned name in an object is
faster than a search written in a closure.

## Values in the loop

A property schema that only allows some scalars (`enum` or `const`, with a
`typeIs` that each of them passes) as a set on the entry, checked in the
loop with `has`, as a property schema that only checks the type is a mask.

| | B/A | | B/A |
| --- | --- | --- | --- |
| `clang-format` | 0.804 | `dependabot` | 0.809 |
| `gitpod-configuration`, `jshintrc`, `stylecop` | 0.92–0.93 | `ui5` | 0.969 |
| `omnisharp` | 1.054–1.096 | `stale`, `nest-cli`, `cypress` | 1.02–1.05 |

- `omnisharp`, `stale`, and `nest-cli` have one or two of these
  properties, which their instances rarely reach. With the field on every
  entry but never a set, they were 1.00–1.01. With the check in the loop
  but never a set, `omnisharp` was 1.010 and `stale` 1.042.
- Every property loop is built from the same closures, so they share V8's
  feedback. While every entry's set is `undefined`, the field is a
  constant that the check can be folded into. Once any loop in the process
  has a set, every loop loads and tests it.
- A copy of the two loops for loops with sets, so the others keep theirs,
  removed the losses (`omnisharp` 1.011, `stale` 1.013, `nest-cli` 0.989,
  `cypress` 1.022) and kept the gains (`clang-format` 0.781, `dependabot`
  0.835, `jshintrc` 0.924, `ui5` 0.977). It isn't done: the two loops would
  each be written twice, the same but for one test, and kept that way only
  for V8's feedback.
