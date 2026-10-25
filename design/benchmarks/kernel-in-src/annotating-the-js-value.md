# Annotating the JS value instead of its AST

First recorded 2026-10-24.

A prototype evaluated the JS value when annotating without plugins, with
each annotation recording its location, and attached the annotations to
the AST from `fromJs` afterwards (plugins still evaluated the AST, because
they see its nodes). `ab.ts`, B/A:

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| Finding nodes with a `Map` of each object's properties | 1.214 | 1.225 | 1.094 |
| A location keeps its node, small objects searched | 1.084 | 1.069 | 0.941 |

- Evaluating got cheaper, but finding the node of nearly every annotation
  and making a location for every value evaluated cost more. It isn't
  used.
