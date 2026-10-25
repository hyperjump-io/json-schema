# CLI

The `hyperjump` CLI is its own package and repository,
[`hjlint`](https://github.com/hyperjump-io/hjlint) (`../hjlint`), with its
own [the design docs](../README.md). It was here first, as `src/cli/` and then as an npm
workspace. It's separate so the libraries don't depend on `unified-args`
and the engine, and it uses only this package's public API.

- The lint rule tests used the CLI's processor. They use
  `src/lint/test-linter.js`, which parses and resolves the way the CLI
  does, without the engine.
