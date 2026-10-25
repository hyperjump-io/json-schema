# Evaluating with plugins and annotating

First recorded 2026-10-24.

Timings of a few percent drifted more than that between runs (10–15%), so
`benchmark/claude/ab/ab.ts` loads two copies of `src/` in one process and
alternates them round by round (`ab-setup.sh <rev>` makes the copies).
Two identical copies come out within 1%. B's time as a fraction of A's,
median of 21 rounds, HEAD against the changes:

| | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
| --- | --- | --- | --- |
| Every hook: bit mask, `apply` without a closure | 0.987 | 0.950 | 0.986 |
| Every hook: and `cases` by type, `all` of two unrolled | 0.986 | 0.935 | 0.981 |
| Every hook: and locations built when read | 0.738 | 0.830 | 0.806 |
| A plugin that reads every location | 1.022 | 0.991 | 0.990 |
| Annotating | 0.981 | 0.978 | 0.992 |

- Building a JSON Pointer for every schema evaluated on a child was the
  biggest cost the evaluator had with plugins: not building them at all
  was 0.747–0.865 of the time.
- A CPU profile put 15% of evaluating `package.json` with every hook in
  `jsInstance.entries` (`Object.entries`). Looping over the object without
  allocating anything instead was no faster on `package.json` and 3–4% on
  the others, so the profile was counting the loop bodies V8 inlined into
  it, and it didn't change.
- Annotating spends about 35% converting the plain value to an AST
  (`fromJs` in `@hyperjump/browser`), half of that building node locations
  (`appendToLocation`, a JSON Pointer escape and an IRI check for every
  node), and 7% attaching annotations. The evaluator is about 30%.
  `validateJson` is mostly parsing.
- `@hyperjump/browser` now caches encoded segments in `appendToLocation`
  (up to 10,000 names of up to 100 characters), and appends array indexes
  without encoding them. Encoding was 16 of `fromJs`'s 25 ms on the
  `package.json` instances: checking each name for characters to encode
  cost about 46 ns a name, against 9 ns to concatenate, and only 7,453 of
  its 161,581 names are different. An A/B of the browser's two versions
  (the same way as `ab.ts`):

  | | `package.json` | `tsconfig.json` | OpenAPI 3.0 |
  | --- | --- | --- | --- |
  | `fromJs` | 0.537 | 0.349 | 0.445 |
  | Parsing (`fromJson`) | 0.918 | 0.854 | 0.821 |
  | Indexes appended directly, after the cache | 0.932, 0.995 | 0.999, 0.999 | 1.031, 0.982 |

  Annotating small `package.json` files went from 12.6–14.5 to
  10.4–12.3 ms in separate runs; the other groups were within their
  noise.
