# Output formats

- Output formats are values, exported from `@hyperjump/json-schema`
  (`FLAG`, `BASIC`, `DETAILED`, in `src/output/`) and passed as `output`.
  They aren't a separate entry point (`@hyperjump/json-schema/output`, as
  first designed), because bundlers drop the named exports that aren't
  imported either way. A
  format is an `OutputFormat<R>`, a function that returns a plugin and an
  `output(valid, syntaxErrors)` function for each evaluation, so every
  format can include syntax errors. `R` is its result, so `validate`'s
  return type comes from the format, and a custom format is typed the same
  way. The output format being developed for the next spec release will be
  another one.
- FLAG is the default. The validator recognizes it and runs the fast
  closures without calling it, so it allocates nothing, and code that only
  uses FLAG never imports BASIC or DETAILED.
- Before 2026-10-29, formats were registered by name on the `JsonSchema`
  (`addOutputFormat`, `getOutputFormat`) and typed through an augmentable
  `OutputFormats` interface. Every registered format stayed in a bundle,
  and a custom one needed declaration merging. FLAG couldn't be replaced;
  now there's nothing to replace.
- Without user plugins, an instance is evaluated with the fast closures
  first, and the format's plugin only runs on a second evaluation if the
  instance is invalid. Valid instances never pay for error collection. With
  user plugins, there's one instrumented evaluation that includes the
  format's plugin.
- BASIC doesn't give an error of its own to a keyword whose failure is fully
  explained by its subschemas' (`KeywordInfo.explainsFailure`, read from
  the keyword's expression). A failing `oneOf` of two schemas isn't
  explained by its subschemas, but `anyOf` or `oneOf` of one schema is, and
  so are `conditional` and `dependencies` with only schemas.
- A failing condition (the `if` subschema, or a condition of
  `conditional`) only decides which subschema applies, so BASIC and DETAILED
  don't report its errors. They know the conditions from
  `KeywordInfo.conditions`, read from the keyword's expression, so they
  don't recognize any keyword by URI.
- The built-in formats' errors don't have messages. Explaining errors is
  left to other output formats, such as `json-schema-errors`, so messages
  aren't part of the keyword interface.
- BASIC and DETAILED collect errors in one list for the whole evaluation.
  A schema's or keyword's plugin state is where its errors start in the
  list, so nothing is allocated until something fails. A passing schema or
  keyword cuts the list back to where it started, which drops what its
  subschemas added. A failing keyword's error goes before its subschemas'
  errors (BASIC) or takes them as its `errors` (DETAILED). Only `if` and
  `conditional` have a state object, with their conditions. The list is
  only cut when it's longer, because setting an array's length is slow even
  when it doesn't change. That made BASIC's plugin cost about the same as
  hooks that do nothing.
- Errors are created when a keyword fails, even though most are dropped
  when the branch they're in passes (failed `anyOf` alternatives, `if`
  conditions). Creating only the ones that are kept was considered, but
  an error is a small object now that locations are cheap to read, and not
  creating error objects at all was only 0–3% faster.
- BASIC and DETAILED say a `file:` location relative to the working
  directory, when the output is made (see [Local paths in messages and
  output](../file-uris.md)).
- Output formats can share utility functions, but not a base class. Each
  format's plugin has all of its own hooks, so it reads on its own and can
  change without affecting the others.
