# Configuration

## `new JsonSchema(config)`

```typescript
const jsonSchema = new JsonSchema({
  dialects: [v1Dialect],
  formats: fullFormats,
  allowRetrieval: ["./", "https://schemas.example.com/"],
  defaultDialectUri: "https://json-schema.org/v1",
  validateFormats: true
});
```

What schemas can use is decided by the config, a `JsonSchemaConfig`, and
can't change after the `JsonSchema` is created. Its dialects give the
`JsonSchema` its [schema type](schema-types.md).

| Option | Default | What it does |
| --- | --- | --- |
| `dialects` | None | The dialects schemas can use, with their keywords and formats. See [Dialects](dialects.md). |
| `formats` | None | More formats, like `fullFormats` for `hostname`, `idn-hostname`, and `idn-email`. See [Formats](formats.md). |
| `keywords` | None | Keywords that replace a dialect's, or that a dialect names by URI. See [Custom keywords](../extending/keywords.md). |
| `vocabularies` | None | Vocabularies meta-schemas can use with `$vocabulary`. See [Dialects](dialects.md#custom-meta-schemas). |
| `allowRetrieval` | `["./"]` | The URLs schemas can be retrieved from. See [Controlling retrieval](retrieval.md). |
| `defaultDialectUri` | None | The dialect of a schema that has no `$schema` and gets no dialect from anywhere else. See [Dialects](dialects.md#schemas-without-schema). |
| `validateFormats` | The dialect's | Whether `format` validates, for every dialect. See [Formats](formats.md). |

## What you add to it

| Method | What it adds | See |
| --- | --- | --- |
| `addUriSchemePlugin(plugin)` | A way to retrieve URIs, or a replacement HTTP plugin | [Controlling retrieval](retrieval.md#sending-credentials) |

Schemas that aren't retrieved go in its `registry` property, which starts
empty (see [Loading schemas](loading-schemas.md#registries)).

## Per call

Every operation (`validate`, `validator`, `compile`, `bundle`, `lint`, …)
and `jsonSchema.session()` take options that apply to that call only. An
operation given a session uses the session's, so it can't take these.

| Option | What it does |
| --- | --- |
| `registry` | Schemas for this call, checked before the `JsonSchema`'s `registry` |
| `allowRetrieval` | Replaces the config's `allowRetrieval` |

## Per validator

`validate`, `validator`, `annotate`, and `annotator` also take these, and
so do `validatorFor` and `annotatorFor`:

| Option | Default | What it does |
| --- | --- | --- |
| `input` | `"value"` | What the instance is: `"value"`, `"json"` (JSON text), or `"node"` (a JSON AST). See [Validating](validating.md#what-to-validate). |
| `output` | `FLAG` | `FLAG`, `BASIC`, `DETAILED`, or one of your own. See [Output and errors](output.md). |
| `plugins` | None | [Evaluation plugins](../extending/plugins.md) that observe the evaluation |
