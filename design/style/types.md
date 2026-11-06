# Types

- The API is declared in hand-written `.d.ts` files next to the JS, and
  they're the source of truth for it. They have JSDoc explaining the
  details, which editors show.
- A `.d.ts` next to a `.js` file declares that module's API. One without a
  `.js` file declares a concept (`keyword.d.ts`, `output-format.d.ts`).
- The JS is typed with JSDoc. Type-checking (`npm run type-check`) includes
  the declaration files.
- Each lint rule has a `.d.ts` that explains why what it reports matters,
  and its options.
- A value declared in a `.d.ts` is used as a type with `typeof`:
  `/** @type typeof API.compile */`. TypeScript 7 doesn't let JSDoc use a
  value's name as its type.
- A type predicate, or a return type that a union of object literals has
  to fit, goes in `@param` and `@returns`, not `@type`. With `@type`,
  TypeScript 7 infers the function's own type and checks that against it,
  so a predicate is lost and the literals are combined into a type with
  `?: undefined` properties, which `Json` doesn't allow.
