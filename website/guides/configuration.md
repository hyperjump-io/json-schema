# Configuration

## The config

```typescript
import { jsonSchemaConfig } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";
import { fullFormats } from "@hyperjump/json-schema/formats/full";

const config = jsonSchemaConfig({
  dialects: [v1Dialect],
  formats: fullFormats,
  defaultDialectUri: "https://json-schema.org/v1",
  validateFormats: true,
  allowRetrieval: ["./", "https://schemas.example.com/"]
});
```

`jsonSchemaConfig` makes the config, a `JsonSchemaConfig`. It's a plain
object, `@hyperjump/browser`'s config with the JSON Schema media types in
its `mediaTypes`. Every operation takes it first, and a session is made
from it. Most applications make one config and use it everywhere. Its
dialects give the config its [schema type](schema-types.md).

### What schemas can use

These options decide what schemas can use.

| Option | Default | What it does |
| --- | --- | --- |
| `dialects` | None | The dialects schemas can use, with their keywords and formats. See [Dialects](dialects.md). |
| `formats` | None | More formats, like `fullFormats` for `hostname`, `idn-hostname`, and `idn-email`. See [Formats](formats.md). |
| `keywords` | None | Keywords that replace a dialect's keywords or that a dialect names by URI. See [Custom keywords](../extending/keywords.md). |
| `vocabularies` | None | Vocabularies meta-schemas can use with `$vocabulary`. See [Dialects](dialects.md#custom-meta-schemas). |
| `defaultDialectUri` | None | The dialect of a schema that has no `$schema` and gets no dialect from anywhere else. See [Dialects](dialects.md#schemas-without-schema). |
| `validateFormats` | The dialect's | Whether `format` validates in every dialect. See [Formats](formats.md). |

The config's first media type, JSON Schema, has the definitions in its
`definitions` property, by URI: its `keywords`, `formats`, `dialects`, and `vocabularies`.
They're the options', then the ones its dialects bring. Dialects and
vocabularies are by the URI without a fragment. A dialect a meta-schema
defines isn't in `dialects`. Use `getDialect` with a session to find one of
those.

```typescript
config.mediaTypes[0].definitions.dialects;
```

### How schemas are found

These options are `@hyperjump/browser`'s, and they're in the config as
they are.

| Option | Default | What it does |
| --- | --- | --- |
| `mediaTypes` | JSON Schema and JSON | More media types documents can be in, like `jrefMediaType` from `@hyperjump/browser` for JRef. They come after JSON Schema's. See [browser's media types](https://github.com/hyperjump-io/browser/blob/v2/website/media-types.md). |
| `registry` | None | Schemas for every call and session, like custom meta-schemas. See [Loading schemas](loading-schemas.md#schemas-for-every-call). |
| `allowRetrieval` | `["./"]` | The URLs schemas can be retrieved from. See [Controlling retrieval](retrieval.md). |
| `headers` | None | Headers to send with requests, such as credentials, by URL. See [Controlling retrieval](retrieval.md#sending-credentials). |
| `stack` | `http:`, `https:`, and `file:`, one for each session | What schemas are retrieved through, such as a transport with more URL schemes or an HTTP cache that calls share. See [Retrieving less](retrieval.md#retrieving-less) and [browser's layers](https://github.com/hyperjump-io/browser/blob/v2/website/layers.md). |

The config takes `@hyperjump/browser`'s other options too, like
`maxRedirects`.

## Per call

Every operation takes options that apply to that call only. The operations
are `validate`, `validator`, `compile`, `bundle`, `lint`, and so on.

| Option | What it does |
| --- | --- |
| `registry` | Schemas for this call. The call sees them and the config's `registry` as one registry. |
| `allowRetrieval` | Replaces the config's `allowRetrieval` |

A session takes only a config. For a session with its own registry or
`allowRetrieval`, give it a config that has them, like
`new Hyperjump({ ...config, registry })`, with `Hyperjump` from
`@hyperjump/browser`.

## Per validator

`validate`, `validator`, `annotate`, `annotator`, `validatorFor`, and
`annotatorFor` also take these:

| Option | Default | What it does |
| --- | --- | --- |
| `input` | `"value"` | What the instance is: `"value"`, `"json"` (JSON text), or `"node"` (a JSON AST). See [Validating](validating.md#what-to-validate). |
| `output` | `FLAG` | `FLAG`, `BASIC`, `DETAILED`, or one of your own. See [Output and errors](output.md). |
| `plugins` | None | [Evaluation plugins](../extending/plugins.md) that observe the evaluation |
