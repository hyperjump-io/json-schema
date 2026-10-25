# Custom formats

A format is a plain object with a URI. Add it with `addFormat`, then give
it a name in a dialect with `extendDialect`.

```javascript
import { v1DialectUri } from "@hyperjump/json-schema/v1";

jsonSchema.addFormat({
  uri: "https://example.com/format/hex",
  types: ["string"],
  validate: (value) => /^[0-9a-f]+$/i.test(value)
});

jsonSchema.extendDialect(v1DialectUri, {
  formats: { hex: "https://example.com/format/hex" }
});
```

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "string",
  "format": "hex"
}
```

`types` lists the types of value the format applies to. A value of any
other type is valid, and `validate` isn't called for it, as the spec says.
Without `types`, a format applies to every type.

There's no `integer` type for formats, because formats apply to the types in
JSON's data model. A format for integers applies to numbers, and checks
that they're integers in `validate`.

Whether a format validates or is only an annotation is up to the dialect
and the `validateFormats` config, like the built-in formats. See
[Formats](../guides/formats.md).

To use a format in several dialects, extend each one. To replace a
built-in format, add one with its URI, like
`https://json-schema.org/format/email`.
