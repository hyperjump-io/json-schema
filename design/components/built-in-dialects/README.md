# Built-in dialects

Each dialect's module exports its dialect (`v1Dialect`,
`draft202012Dialect`, …), which carries the keyword and format definitions
it uses. The JSON Schema media types only have the dialects in their
options, plus `$schema` and the unknown keyword, which every dialect has.
Any of them can be in one set of options.

- `jsonSchemaConfig` registers each definition a dialect brings that
  isn't registered yet, after the options' own `keywords` and `formats`. So
  a keyword replaced through the options stays replaced,
  whatever order the dialects are in, and the same dialect twice throws.
  The dialect is stored with URIs (`getDialect` returns
  `{ keywords: Record<string, string> }`), the form everything that reads
  dialects uses.
- Each dialect imports every keyword and format definition it uses, and
  defines its own format names, even though most are the same in every
  dialect. A dialect is read on its own, and a shared list would hide what
  each one uses.
- Rejected: presets, like `addV1(config)`, that add a dialect named by
  URIs, with a separate list of the definitions it uses. Dialects carry
  their definitions, so the list is the dialect's maps, and there are no
  setup functions (see [Dialects](../dialects/README.md#the-options)).
- v1 is a dialect like the others. Rejected: v1 in every config, so
  keyword schemas could be written in v1.
- v1's `conditional`, `itemPattern`, and `requireAllExcept` aren't full
  proposals yet. They're in its `keywords` under a comment. Rejected:
  adding them with `extendDialect` as a reminder.
- Formats that need Unicode data aren't in any dialect. A dialect names
  them by URI, and they're only supported when `fullFormats` is in the
  options' `formats`.

- Rejected: a separate preset value (`{ dialect, keywords, formats }`) for
  each dialect, which was only needed while a dialect named its keywords by
  URI; and keeping `addV1` and the others for unified pipelines. A unified
  plugin's `this` is the processor, not a `JsonSchema`, and a pipeline that
  needs dialects is given a session whose config has them, as lint's rules
  are.

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
- [OpenAPI 3.0, 3.1, and 3.2](openapi.md)
