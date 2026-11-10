# Strings

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "stringLength", min?: number, max?: number }` | string | its length in code points is within the limits |
| `{ op: "matches", pattern: string }` | string | the ECMA-262 pattern matches, with the `u` flag, or without it if the pattern is only valid without it |
| `{ op: "format", name: string, uri: string \| null, assert: boolean }` | the format's `types` (to assert) | see below |

- **`format`** annotates `name`. If `assert` is true, it also asserts the
  format `uri`. Lowering decides `assert` from the dialect's
  `assertFormats`, which the `validateFormats` config sets, so a serialized
  expression means the same wherever it's restored, and compiling or
  restoring fails if an asserting format isn't registered. It
  asserts only on the types the format declares (`Format.types`), so lint
  gets them from the operation, but it annotates instances of every type,
  as `format` did before the kernel. It's the one exception to "applies to".
