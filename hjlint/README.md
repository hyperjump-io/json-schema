# hjlint

The command-line interface for
[Hyperjump JSON Schema](https://github.com/hyperjump-io/json-schema), so you
can run it with `npx` without installing anything first.

```bash
npx hjlint schemas/ data/
```

It lints JSON Schemas and validates JSON files against them. It's the same
command as `hyperjump` (and `hjlint`) in projects that install
`@hyperjump/json-schema`. See its README for the options, the `.hyperjumprc`
configuration, and lint rules.

This package only runs the command. It depends on the latest
`@hyperjump/json-schema` 2.x, so it's only released again when it changes or
when there's a new major version.
