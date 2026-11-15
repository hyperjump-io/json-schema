# Linting from code

Linting needs a unified pipeline today, outside of the CLI.
`lint(jsonSchema, uri)` (`src/operations/lint.js`) lints a schema
document without one. It takes a URI, not a schema
as a value, because it lints a document, and a value's document would only
be the value.

- It lints the whole document `uri` is in, the way `bundle` takes the
  whole document, including definitions nothing in it references. A rule
  sees every schema in the document, as in a unified pipeline. Rules that
  check one schema from an entry point, like `compile` lowers, were tried
  and dropped: a file of shared definitions would get almost nothing
  linted, and what's linted would depend on what can be lowered, so a
  schema with an unknown dialect or a keyword value that doesn't fit its
  shape would stop lint quietly.
- It doesn't lint the documents `uri` references. Each document is linted
  on its own, as a file is in the CLI.
- `compile` doesn't lint. A compiled schema is the entry point and what it
  reaches, which isn't the unit lint works on, so linting the documents it
  used would report on schemas it doesn't use.
- The plugins are `options.plugins`, in the shape of `.hyperjumprc`'s
  (`[recommended, [rule, ["warn"]]]`), and `lint/recommended` without them.
  It's loaded when it's needed, so code that never lints never loads the
  rules.
- It returns plain `SchemaMessage`s (see [Validation API](../validation-api/README.md)), with each
  message's `severity` (`"error"` if the rule made it fatal, `"warn"`
  otherwise), the document's URI, and the rule's `url`. Each built-in rule's
  `url` is its page on hyperjump.io (`/json-schema/linting/rules/<rule>/`),
  set in its own meta, since `lintRule` is public and a custom rule's page
  is elsewhere. A document with problems has no
  tree, so its problems are what's returned, not thrown. A rule's message
  is specific, so it's kept. Rules still report with `file.message`, so
  results are converted from `VFileMessage`s when the pass finishes.
- Rules don't run in the media type plugin's `parse`. A resolved document
  from a registry is cached once per `JsonSchema` and shared by sessions
  (see [Making sessions cheap](../registries/cheap-sessions.md)), so it would keep the results of the
  first session's rules. Lint is a separate pass over a resolved document,
  in a `VFile` with the session on `file.data.jsonSchemaSession`.
- No rule sets for each dialect. A document can embed resources in other
  dialects, so a document's rules can't come from one dialect. Rules
  already do nothing where their keywords aren't loaded (see [Rules](rules.md)), so
  `lint/recommended` works in every dialect.
