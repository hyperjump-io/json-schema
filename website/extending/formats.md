# Custom formats

A format is a plain object with a URI. Give it a name in a dialect with
`extendDialect`. Then give the dialect it returns to `jsonSchemaConfig`.

```typescript
import { extendDialect, jsonSchemaConfig } from "@hyperjump/json-schema";
import type { Format } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const hexFormat = {
  uri: "https://example.com/format/hex",
  types: ["string"],
  validate: (value) => typeof value === "string"
    && /^[0-9a-f]+$/i.test(value)
} satisfies Format;

const config = jsonSchemaConfig({
  dialects: [extendDialect(v1Dialect, { formats: { hex: hexFormat } })]
});
```

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "string",
  "format": "hex"
}
```

`types` lists the types of value the format applies to. As the spec says, a
value of any other type is valid, and `validate` isn't called for it.
Without `types`, a format applies to every type.

`validate` may get the instance itself rather than a copy, so its type is
readonly: a `ReadonlyJson`. `types` doesn't narrow the type, so check the
type before using the value.

There's no `integer` type for formats, because formats apply to the types
in JSON's data model. A format for integers applies to numbers. Its
`validate` checks that they're integers.

As with the built-in formats, the dialect and the `validateFormats` option
decide whether a format validates or only annotates. See
[Formats](../guides/formats.md).

To use a format in several dialects, extend each one. To replace a built-in
format, add one with the same URI, like
`https://json-schema.org/format/email`.
