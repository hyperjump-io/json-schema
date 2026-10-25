# Presets

A `JsonSchema` starts with no dialects, only `$schema` and the unknown
keyword, which every dialect has. Presets are independent, and any of them
can be added to one `JsonSchema`.

- A preset adds its dialect, then each keyword and format its dialect uses
  that hasn't been added yet (`addPreset` in
  `src/dialects/add-preset.js`). So a keyword someone replaced stays
  replaced, whatever order presets are added in, and adding a preset twice
  throws before it changes anything.
- Each preset imports and lists every keyword and format definition its
  dialect uses, and defines its own format names, even though most are the
  same in every preset. A preset is read on its own, and a shared list
  would hide what each one uses. `addPreset` throws if the dialect names a
  keyword that isn't in the list.
- v1 used to be in every `JsonSchema`, because keyword schemas were written
  in v1. Now it's a preset like the others (`addV1`).
- Formats that need Unicode data aren't added by any preset. A dialect can
  still name them, and they're only supported once the full formats are
  added.

## Meta-schemas

- The presets don't include the official meta-schemas. They aren't needed
  to identify, resolve, or validate schemas, because each preset adds its
  dialect and schemas are validated keyword by keyword. Compiling a
  meta-schema, or a schema that references one, retrieves it like any other
  schema.

## Contents

- [Built-in keywords](built-in-keywords.md)
- [2020-12](draft-2020-12.md)
- [2019-09](draft-2019-09.md)
- [draft-04, draft-06, and draft-07](draft-04-06-07.md)
