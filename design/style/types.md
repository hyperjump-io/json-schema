# Types

- The API is declared in hand-written `.d.ts` files next to the JS, and
  they're the source of truth for it. They have JSDoc explaining the
  details. `npm run docs` generates the API docs from them.
- A `.d.ts` next to a `.js` file declares that module's API. One without a
  `.js` file declares a concept (`keyword.d.ts`, `output-format.d.ts`).
- The JS is typed with JSDoc. Type-checking (`npm run type-check`) includes
  the declaration files.
- Each lint rule has a `.d.ts` that explains why what it reports matters,
  and its options.
