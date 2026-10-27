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

- A CPU profile of `package.json` ASTs with every hook put 12.8% in
  `astInstance.entries`, a generator. It builds an array of the entries
  now. Unlike `jsInstance.entries` (see
  [Evaluating with plugins and annotating](plugins-and-annotating.md)),
  that time was the generator itself.
