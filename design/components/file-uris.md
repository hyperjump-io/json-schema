# Local paths in messages and output

A message, an error, or an output that names a `file:` URI says where the
files are on the machine, wherever it ends up: a CI log, an issue, a
documentation page, an error reporter. So a `file:` URI is said relative to
the working directory, with browser's `relativeFileUri`, everywhere one
leaves the library as text or output (see
[No local paths in output](../principles/no-local-paths.md)). Browser's own
errors do the same (see its
[Local paths in errors](https://github.com/hyperjump-io/browser/blob/v2/design/components/file-uris.md)),
and the library re-exports the function for output formats and plugins.

- It's always the working directory, the base browser resolves relative
  URLs against: lint messages, problems from resolving a schema, output
  formats' locations, the validate plugin's messages, and thrown errors. A
  message reads the same whichever file it's on, and an output doesn't
  depend on where evaluation started.
- BASIC and DETAILED do it when the output is made, for the errors that
  are kept, not for each one that's created.
- Only `file:` URIs change. Other URIs are public identifiers, and the spec
  says `absoluteKeywordLocation` is absolute, so this is as small a
  deviation from it as it can be.
- Only a document's location can be a `file:` URI. `$schema` in a schema is
  absolute, so a dialect URI is what the author wrote, and messages about
  dialects say it as it is.
- Messages that say a URI that's usually not a file, like a dialect's or a
  handle, still go through `relativeFileUri`, so one that is a file can't
  say where it is. `relativeFileUri` returns anything else as it is.
- Messages are made from the URIs, not rewritten afterwards. A pointer's
  message is from browser's `pointerGet`, which is given the relative
  document URI, and a missing file is browser's `FileNotFoundError`.
- A problem whose message is a thrown error's message gets that error's
  cause as its cause, not the error, which would say it again.
- `reference-without-target` doesn't give its message a cause. A missing
  schema is a finding, not a failure.
- A stack trace still says where the library is installed, so the CLI
  prints causes without them (see hjlint's Input and output).
- A bundle of files is identified by its `id` option, so it doesn't have
  `file:` identifiers (see [Bundling](bundling.md)).
- A serialized kernel's `file:` URIs are relative to its entry's document
  instead, so it can be restored wherever the files are moved (see
  [Compile and evaluate](kernel/README.md)).
- An error keeps the exact URI on a property where code needs it, like
  browser's `RetrievalError.uri` and `AnchorNotFoundError.uri`.
  `SchemaMessage.uri` and a `VFileMessage`'s `file` stay absolute too,
  because they identify the document for the code that has it.

Rejected:

- Relative to the file a message is on, and an output relative to the
  schema being validated. A message would read differently depending on
  which file it's on, and every place that makes one would need its own
  base.
- Keeping absolute URIs in errors the API throws, so callers would know
  exactly what failed. A thrown error becomes a cause, and causes are
  reported. Code that needs the URI has it on a property.
- Making the CLI's reporter relativize `file:` URIs. Messages and output
  reach more than the CLI: the language server, `lint(uri)`, and code that
  logs `outputErrorMessage`.
- Rewriting every `file:` URI in message text. Which part of a message is a
  URI isn't known, and the places that make messages know.
