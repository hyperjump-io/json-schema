# Built-in dialects

Each dialect's module exports its dialect (`v1Dialect`,
`draft202012Dialect`, …), which carries the keyword and format definitions
it uses. A `JsonSchema` only has the dialects in its config, plus
`$schema` and the unknown keyword, which every dialect has. Any of them can
be in one config.

- Constructing a `JsonSchema` registers each definition a dialect brings
  that isn't registered yet, after the config's own `keywords` and
  `formats`. So a keyword replaced through the config stays replaced,
  whatever order the dialects are in, and the same dialect twice throws.
  The dialect is stored with URIs (`getDialect` returns
  `{ keywords: Record<string, string> }`), the form everything that reads
  dialects uses.
- Each dialect imports every keyword and format definition it uses, and
  defines its own format names, even though most are the same in every
  dialect. A dialect is read on its own, and a shared list would hide what
  each one uses.
- Until 2026-10-29, these were presets: `addV1(jsonSchema)` and so on
  added a dialect named by URIs, with a separate list of the definitions it
  used (`addPreset`). Dialects carry their definitions now, so the list
  became the dialect's maps, and the add functions went with the rest of
  the setup methods (see [Definitions](../api/definitions.md)).
- v1 used to be in every `JsonSchema`, because keyword schemas were written
  in v1. Now it's a dialect like the others.
- v1's `conditional`, `itemPattern`, and `requireAllExcept` aren't full
  proposals yet. They're in its `keywords` under a comment. They used to be
  added with `extendDialect` as a reminder.
- Formats that need Unicode data aren't in any dialect. A dialect names
  them by URI, and they're only supported when `fullFormats` is in the
  config's `formats`.

## Meta-schemas

- The built-in dialects don't include the official meta-schemas. They
  aren't needed to identify, resolve, or validate schemas, because each
  dialect is in the config and schemas are validated keyword by keyword.
  Compiling a meta-schema, or a schema that references one, retrieves it
  like any other schema.

## Contents

- [Built-in keywords](built-in-keywords.md)
- [2020-12](draft-2020-12.md)
- [2019-09](draft-2019-09.md)
- [draft-04, draft-06, and draft-07](draft-04-06-07.md)
