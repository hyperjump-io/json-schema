# @hyperjump/json-schema v2

A rewrite of `@hyperjump/json-schema` on `@hyperjump/browser` v2 and unified.
Read `DESIGN.md` first. It has the decisions made so far, open questions, and
the plan. Measurements are in `BENCHMARKS.md`.

## Development

- `npm test`, `npm run lint`, `npm run type-check`
- The API is declared in hand-written `.d.ts` files next to the JS, which is
  typed with JSDoc. Type-checking includes the declaration files.
- `@hyperjump/browser` is the sibling repo `../browser`, linked with
  `file:../browser`. Changes there go on its `v2` branch.

## Working agreements

- Ask before committing. Keep unrelated changes in separate commits.
