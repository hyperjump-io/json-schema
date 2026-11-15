# Configuration

## `configureJsonSchema(config)`

```typescript
const jsonSchema = configureJsonSchema({
  dialects: [v1Dialect],
  formats: fullFormats,
  allowRetrieval: ["./", "https://schemas.example.com/"],
  defaultDialectUri: "https://json-schema.org/v1",
  validateFormats: true
});
```

The config is a `JsonSchemaConfig`. It decides what schemas can use, and it
can't change after the `JsonSchema` is created. Its dialects give the
`JsonSchema` its [schema type](schema-types.md).

| Option | Default | What it does |
| --- | --- | --- |
| `dialects` | None | The dialects schemas can use, with their keywords and formats. See [Dialects](dialects.md). |
| `formats` | None | More formats, like `fullFormats` for `hostname`, `idn-hostname`, and `idn-email`. See [Formats](formats.md). |
| `keywords` | None | Keywords that replace a dialect's keywords or that a dialect names by URI. See [Custom keywords](../extending/keywords.md). |
| `vocabularies` | None | Vocabularies meta-schemas can use with `$vocabulary`. See [Dialects](dialects.md#custom-meta-schemas). |
| `allowRetrieval` | `["./"]` | The URLs schemas can be retrieved from. See [Controlling retrieval](retrieval.md). |
| `defaultDialectUri` | None | The dialect of a schema that has no `$schema` and gets no dialect from anywhere else. See [Dialects](dialects.md#schemas-without-schema). |
| `validateFormats` | The dialect's | Whether `format` validates in every dialect. See [Formats](formats.md). |
| `stack` | `http:`, `https:`, and `file:`, with an HTTP cache in Node.js | What schemas are retrieved through, such as a transport with more URL schemes or a cache on disk. Every session uses it as it is. See [browser's layers](https://github.com/hyperjump-io/browser/blob/v2/website/layers.md). |
| `headers` | None | Headers to send with requests, such as credentials, by URL. See [Controlling retrieval](retrieval.md#sending-credentials). |
| `registry` | None | Schemas for every call and session, like custom meta-schemas. See [Loading schemas](loading-schemas.md#schemas-for-every-call). |
| `mediaTypes` | JSON Schema, JSON, and JRef | More media types, after the defaults, which they can't replace. See [browser's media types](https://github.com/hyperjump-io/browser/blob/v2/website/media-types.md). |

Its `keywords`, `formats`, `dialects`, and `vocabularies` properties are
the definitions it has, by URI: the config's, then the ones its dialects
bring. Dialects and vocabularies are by the URI without a fragment. A
dialect a meta-schema defines isn't in `dialects`. Use `getDialect` with a
session to find one of those.

## Per call

Every operation and the `JsonSchemaHyperjump` constructor take options
that apply to that call only. The operations are `validate`, `validator`,
`compile`, `bundle`, `lint`, and so on.

| Option | What it does |
| --- | --- |
| `registry` | Schemas for this call, checked before the `JsonSchema`'s `registry` |
| `allowRetrieval` | Replaces the config's `allowRetrieval` |

## Per validator

`validate`, `validator`, `annotate`, `annotator`, `validatorFor`, and
`annotatorFor` also take these:

| Option | Default | What it does |
| --- | --- | --- |
| `input` | `"value"` | What the instance is: `"value"`, `"json"` (JSON text), or `"node"` (a JSON AST). See [Validating](validating.md#what-to-validate). |
| `output` | `FLAG` | `FLAG`, `BASIC`, `DETAILED`, or one of your own. See [Output and errors](output.md). |
| `plugins` | None | [Evaluation plugins](../extending/plugins.md) that observe the evaluation |
