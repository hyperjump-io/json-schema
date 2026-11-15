# `$schema` and unknown keywords

`$schema` and unknown keywords are part of every dialect. The resolver maps
`$schema` by name, and any other name the dialect doesn't define is
unknown. `jsonSchemaConfig` adds both to every set of definitions,
and they're ordinary keywords otherwise. The unknown keyword can be replaced.

- An unknown keyword's `keywordUri` is
  `https://json-schema.org/keyword/unknown#<name>`. The core looks up the
  definition by `keywordUri` without its fragment and passes the property
  name as `context.keywordName`.
- The unknown keyword's `lower` uses `context.dialect.unknownKeywords` to
  decide whether it's an annotation.
- `$schema` has no check. The resolver reads it to find the dialect and
  reports what's wrong with it then.
