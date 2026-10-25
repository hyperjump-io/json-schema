# Formats (`src/format.d.ts`)

Formats work like keywords. A format definition (`{ uri, types, validate }`,
`src/format.d.ts`) is stateless and added to a `JsonSchema` with
`addFormat`. `types` is the JSON types the format applies to, so the
`format` keyword passes other values without calling `validate`, as the
spec says, and lint can tell which types a format is for. Without it, a
format applies to every type. There's no `integer`, because the spec says
a format applies to data model types. A dialect maps format names to
format URIs (`formats`), and says whether `format` validates by default
(`assertFormats`). The `validateFormats` config overrides that. When
formats are validated, a format the dialect doesn't have, or whose
definition hasn't been added, is an error when the schema is compiled.
Otherwise, `format` is only an annotation, so any name is fine. draft-04
through draft-07 have their own `format` keyword that ignores formats the
dialect doesn't have, rather than a dialect option for it.

The lite formats (`src/formats/lite.js`) are every format JSON Schema
defines except `hostname`, `idn-hostname`, and `idn-email`, which need large
tables of Unicode data. Presets don't use the list. Each lists the
formats its dialect uses, which never include those three. v1 validates
formats by default. `src/formats/full.js` adds the rest. The validators come
from `@hyperjump/json-schema-formats`.
