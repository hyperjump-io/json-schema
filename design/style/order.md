# Order in a file

What a file exports comes first, and the helpers it uses come after it.
Opening a file shows what it does, without scrolling past the helpers to
get to the point.

- Imports, then constants the exports use, like keyword URIs, then the
  exports, then the helpers that aren't exported.
- A lint rule's file is its rule, then `export default`, then its helpers.
- A file with several exports has all of them before its helpers.
- A test file is its `describe` and `test` calls, then its helpers, like
  the `lint` function a lint rule's tests use.
- Something used while the module loads has to come before what uses it,
  because only function declarations are hoisted. `src/kernel/instance.js`
  creates instances of its classes when it loads, so the classes come
  first. A keyword whose definition refers to a helper as a value, like
  `check: checkPattern` in `src/keywords/itemPattern.js`, keeps the helper
  above it.
