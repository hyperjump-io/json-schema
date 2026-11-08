# @hyperjump/json-schema v2

A rewrite of `@hyperjump/json-schema` on `@hyperjump/browser` v2 and unified.

## Docs

- `design/` is for contributors. Start with `design/README.md`, the index,
  and read only the documents about what you're working on. `principles/`
  are the rules decisions are made by, `style/` is how code is laid out,
  `specs/` are contracts (the kernel, keywords, the schema AST),
  `components/` say how each part works and what was decided, with its
  open questions and known limitations, and `benchmarks/` are dated
  measurements.
- `website/` is the user documentation. Each lint rule has a page in
  `website/linting/rules/` and a row in its `README.md`. It's built into
  the site at hyperjump.io by https://github.com/hyperjump-io/hyperjump.io.
  The style guide at
  https://github.com/hyperjump-io/hyperjump.io/tree/main/design/style
  says how to write the prose. How to put pages together is at
  https://github.com/hyperjump-io/hyperjump.io/blob/main/design/README.md#writing-docs.
  Vale checks the docs with the rules in `.vale.ini`. Run `vale sync`
  once to download them. A feature that isn't released gets
  `*Coming soon*` on its own line under its heading. `npm version`
  replaces it with `*Added in vX.Y.Z*` (`scripts/version-docs.js`).
- `TODO.md` is the plan and what's next. It isn't committed.
- Prefer many small documents that each cover one thing. A change to how
  something works updates its document in the same commit. A decision
  that's made goes in its component's document, with what was rejected
  and why.

## Development

- `npm test`, `npm run lint`, `npm run type-check`
- `npm run bundle-size`, and the A/B harness in `benchmark/ab/` (see
  `design/benchmarks/README.md`)
- The API is declared in hand-written `.d.ts` files next to the JS, which is
  typed with JSDoc. Type-checking includes the declaration files.
- `@hyperjump/browser` is the sibling repo `../browser`, linked with
  `file:../browser`. Changes there go on its `main` branch.

## Working agreements

- Ask before committing. Keep unrelated changes in separate commits.
