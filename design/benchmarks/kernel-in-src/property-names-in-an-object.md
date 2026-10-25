# Property names in an object instead of a `Map`

First recorded 2026-10-24.

A profile after the
[evaluator and pass speedups](evaluator-and-pass-speedups.md) still had the property loops as a third
of FLAG on `package.json` and `tsconfig.json`. Looking names up in an
object without a prototype instead of a `Map` (`ab.ts`, B/A):

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| FLAG | 0.906 | 0.780 | 0.968 |
| Every hook | 0.971 | 0.915 | 0.987 |
| Annotating | 0.996 | 0.958 | 1.002 |

- Probably because `for … in` gives names V8 has already internalized,
  and a property lookup with one is cheaper than `Map.get`. That wasn't
  checked.
- Annotating converts the value to an AST with `fromJs` and evaluates the
  AST, through `AstInstance`, whose `entries` is a generator and `get` a
  search. With the browser's cache, `fromJs` and its locations are still
  about a quarter of annotating `package.json`, and attaching annotations
  9–12%.
