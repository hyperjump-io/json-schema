# Formats (`src/format.d.ts`)

Formats work like keywords. A format definition (`{ uri, types, validate }`,
`src/format.d.ts`) is stateless, and a `JsonSchema` gets it from a dialect
or the config's `formats`. `types` is the JSON types the format applies to, so the
`format` keyword passes other values without calling `validate`, as the
spec says, and lint can tell which types a format is for. Without it, a
format applies to every type. There's no `integer`, because the spec says
a format applies to data model types. A dialect maps format names to
format definitions or URIs (`formats`), and says whether `format` validates by default
(`assertFormats`). The `validateFormats` config overrides that. When
formats are validated, a format the dialect doesn't have, or whose
definition isn't in the config, is an error when the schema is compiled.
Otherwise, `format` is only an annotation, so any name is fine. draft-04
through draft-07 have their own `format` keyword that ignores formats the
dialect doesn't have, rather than a dialect option for it.

The lite formats (`src/formats/lite.js`) are every format JSON Schema
defines except `hostname`, `idn-hostname`, and `idn-email`, which need large
tables of Unicode data. The built-in dialects don't use the list. Each
names the formats it uses, and only brings definitions for ones that
aren't those three. v1 validates formats by default. `fullFormats`
(`src/formats/full.js`) has every format, for the config's `formats`. The validators come
from `@hyperjump/json-schema-formats`.

v1's `date-time` is RFC 9557's `date-time-ext`, which is RFC 3339's
`date-time` followed by optional suffixes for a time zone
(`[Europe/London]`) and tags (`[u-ca=chinese]`). draft-04 through 2020-12
use RFC 3339's (`src/formats/draft-2020-12/date-time.js`). The unprefixed
format is the latest spec's, as with `hostname`, and the lite and full
formats have it. The suffix is only checked for syntax, not against the
IANA time zone database.
