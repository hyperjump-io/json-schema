# Configuration

## `new JsonSchema(config)`

```typescript
const jsonSchema = new JsonSchema({
  allowRetrieval: ["./", "https://schemas.example.com/"],
  defaultDialectUri: "https://json-schema.org/v1",
  validateFormats: true
});
```

| Option | Default | What it does |
| --- | --- | --- |
| `allowRetrieval` | `["./"]` | The URLs schemas can be retrieved from. See [Controlling retrieval](retrieval.md). |
| `defaultDialectUri` | None | The dialect of a schema that has no `$schema` and gets no dialect from anywhere else. See [Dialects](dialects.md#schemas-without-schema). |
| `validateFormats` | The dialect's | Whether `format` validates, for every dialect. See [Formats](formats.md). |

## What you add to it

| Method | What it adds | See |
| --- | --- | --- |
| `addV1(jsonSchema)`, `addDraft202012(jsonSchema)`, ... | A dialect | [Dialects](dialects.md) |
| `addFullFormats(jsonSchema)` | `hostname`, `idn-hostname`, and `idn-email` | [Formats](formats.md) |
| `addRegistry(registry)` | Schemas that aren't retrieved | [Loading schemas](loading-schemas.md) |
| `addUriSchemePlugin(plugin)` | A way to retrieve URIs, or a replacement HTTP plugin | [Controlling retrieval](retrieval.md#sending-credentials) |
| `addKeyword`, `addFormat`, `addDialect`, `extendDialect` | Your own keywords, formats, and dialects | [Extending](../extending/README.md) |
| `addOutputFormat(name, definition)` | An output format | [Custom output formats](../extending/output-formats.md) |

## Per compilation

`compile`, `bundle`, `lint`, and `session` take options that apply to that
call only:

| Option | What it does |
| --- | --- |
| `registries` | More registries, checked before the `JsonSchema`'s |
| `allowRetrieval` | Replaces the config's `allowRetrieval` |

## Per validation

The validator's methods take:

| Option | Default | What it does |
| --- | --- | --- |
| `output` | `"FLAG"` | `"FLAG"`, `"BASIC"`, `"DETAILED"`, or one you added. See [Output and errors](output.md). |
| `plugins` | None | [Evaluation plugins](../extending/plugins.md) that observe the evaluation |
