# Small components

Small packages in their own repositories, linked as siblings
(`file:../browser`), rather than workspaces or a monorepo.

- The CLI is its own package, `@hyperjump/cli`, so the libraries don't depend on
  `unified-args` and the engine, and it uses only this package's public API
  (see [CLI](../components/cli.md)).
- New tools, like a language server, start as their own repositories.
- One way to do a thing. Lint rules are configured only as plugins, not
  also through a CLI setting.
