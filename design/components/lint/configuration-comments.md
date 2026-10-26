# Configuration comments

- A `$comment` that starts with `json-schema-lint-disable` turns rules off
  for the schema it's in, including its subschemas, and one that starts
  with `json-schema-lint-enable` turns them back on. The rule IDs after it
  are the rules it covers, and without any, it covers every rule. A rule is
  named by its rule ID, without its source.
- Scopes nest. The innermost schema with a directive that covers a rule
  decides whether it's on, so a subschema can turn a rule back on, or off
  again, just for itself.
- It's found by the `$comment` keyword's URI, and by the unknown keyword's
  URI for `$comment` (`…/unknown#$comment`), so it works in dialects
  without `$comment` (draft-04, draft-06) too.
- A directive that names a rule the processor doesn't use is a warning
  (`unknown-rule`), and so is a `$comment` that starts with
  `json-schema-lint-` but isn't a directive (`unknown-directive`). Both have
  the source `json-schema-lint` and can't be turned off. A rule is used if
  it's made with `lintRule` and added to the processor, even if it's off.
- The prefix is the lint rules' source, `json-schema-lint`, spelled like
  `json-schema`, the source of schema and validation errors. It was
  `jsonschema-lint` while v2 was in development, which looked like a
  misspelling next to it.
- Rules are made with this package's `lintRule`, which wraps
  `unified-lint-rule`'s. When a rule's transformer finishes, it removes the
  messages the rule just added where a directive turns the rule off. The
  first rule to run on a file reports the directive warnings, before the
  rule itself runs, because `unified-lint-rule` gives every message added
  while a rule runs that rule's ID. Directives only affect lint rules, so
  schema problems can't be turned off.
- `unified-message-control` isn't used:
  - It filters the messages already on the file, so it has to run after
    every rule. The rules in `.hyperjumprc` are added after the CLI's
    processor's plugins, so it would run first and see nothing.
  - Its marks are points where rules turn off or on, in document order, not
    ranges that nest. A directive in a subschema would change the state for
    the rest of its parent, too.
  - What it has that this doesn't: `ignore` (the next node only), its
    `reset`, `enable`, and `disable` options for the initial state, which
    `.hyperjumprc` severities cover, and dropping messages in gaps in the
    tree, which a schema AST doesn't have. It controls any rule's messages
    by source, and this only controls rules made with `lintRule`.
- A rule made with `unified-lint-rule` directly ignores configuration
  comments, and naming it in a directive is an `unknown-rule` warning.
- Configuration comments from JSONC comments are deferred, until the CLI
  reads JSONC. They
  would cover from the comment on, as in remark, and need JSONC support,
  which browser's parser has (`allowComments`) and the CLI doesn't, because
  it also decides which files are schemas.
