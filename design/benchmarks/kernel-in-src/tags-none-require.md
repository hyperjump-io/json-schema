# Tags none of them require

First recorded 2026-10-26.

After [Object loops](object-loops.md), v2 was slowest compared to the
other implementations in `jsonschema-benchmark` on ansible-lint's
`meta.json` schema (9.2 times corvus). 64% of its time was
`galaxy_info.platforms`: each item is an `anyOf` of 45 platform schemas
with `"name": { "const": "Ubuntu" }` and an `enum` of versions, and none of
them requires `name`. An object without `name` can pass every one of them,
so the tag's case without the property left all 45, and `bestTag` only
took a tag that left fewer than all of them in every case. The `anyOf`
evaluated them in order, and Ubuntu, the most common, is the 41st.

Each definition, compiled on its own, on its part of the 333 instances
(µs for each run):

| | Before | After |
| --- | --- | --- |
| Whole schema | 362 | 149 |
| `galaxy_info.platforms` (125 arrays, 294 items) | 231 | 43 |
| `galaxy_info` without `platforms` | 45 | 53 |
| `dependencies` items (425) | 28 | 28 |
| corvus, the whole schema (`jsonschema-benchmark`) | 40 | |

When no tag leaves fewer than all of them in every case, `bestTag` takes
the tag by value that leaves the fewest when an object has the property,
and the case without it is the union as it was, not dispatched again,
which would take the same tag.

It changed one union in each of five corpora. `ab.ts`, B/A, against HEAD,
each corpus in a process of its own:

| | FLAG | Hooks that do nothing | `validateJson` |
| --- | --- | --- | --- |
| ansible-meta | 0.410 | 0.104 | 0.426 |
| cmake-presets | 0.776 | 0.129 | 0.373 |
| lazygit | 0.998–1.010 | 1.010 | 0.998 |
| ui5-manifest | 0.994 | 1.026–1.031 | 0.987 |
| OpenAPI 3.0 (`Parameter`) | 0.992 | 0.989 | 0.986 |

- ui5-manifest's union is `defaultValue`, in 2 of its 611 instances.
  Without those two, hooks were 0.995–0.996, and those two alone were
  0.994, so it's the JIT's feedback from the switch, not its evaluation.
- On 44,000 mutants of the five corpora (`ab-equal.ts`, `MUTANTS=20`),
  results were the same, and every BASIC error was one reported before.
  BASIC errors went from 88,635 to 12,823 on ansible-meta and from 183,386
  to 39,566 on cmake-presets.
- `check-src.ts` reported the same as HEAD.
