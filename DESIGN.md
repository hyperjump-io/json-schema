# Design

A from-scratch rewrite of [`@hyperjump/json-schema`](../json-schema) built on
[`@hyperjump/browser`](../browser) v2 and [unified](https://unifiedjs.com/).
Most of the same concepts are included, but often reimagined.

This document records the decisions made so far, what's done, and what's
next. The `.d.ts` files in `src/` are the source of truth for the API. They're
written by hand and have JSDoc explaining the details.

## Goals

- Optimized for the JSON Schema v1 dialect, but capable of supporting draft-04
  and later.
- Everything is per instance. No global state (v1's `registerSchema`,
  `addKeyword`, `setShouldValidateFormat`, … are all global).
- Built on unified so schema documents and instances can be ASTs with
  positions. The language server is a first-class use case.
- Dependent projects (`json-schema-errors`, `json-schema-coverage`,
  `json-schema-language-tools`) don't need to keep working. They'll be
  migrated if this works out.

## Architecture

```text
text ─ rejsonParse ─▶ JSON AST ─ jsonSchemaResolve ─▶ Schema AST ─ (schema validation) ─▶ compile ─▶ IR ─ specialize ─▶ closures
       (browser)                  (async)                                                  (async)         (sync, lazy)
```

- `JsonSchema` extends browser's `Hyperjump<JsonSchemaNode>`, and
  `JsonSchemaSession` extends its `Session`. Schemas are retrieved, browsed,
  and compiled in a session (see "Sessions and registries").
- Schemas are retrieved with browser's `get`. The schema media type plugin
  (`application/schema+json`, `.schema.json`) runs `rejsonParse` and
  `jsonSchemaResolve`. Any message from either is fatal there.
- Plain JSON files are never treated as schemas.

## Schema AST (`src/schema-ast.d.ts`)

A schema AST is a JSON AST with annotations. Nothing is moved, added, or
removed, so it stringifies back to the original document and every node keeps
its position.

- Value nodes are `type: "json"` (data), `"json-schema"` (with `dialectUri`),
  or `"reference"` (with `href`).
- Every property of an object schema has a `keywordUri`. Properties that
  aren't keywords in the dialect get
  `https://json-schema.org/keyword/unknown#<name>`. Tooling needs to identify
  unknown keywords even in dialects that don't allow them.
- `$ref` in draft-04 through draft-07 is a JRef-style `reference` node, not a
  keyword, so browser follows it and it never has a keyword location. Its
  other properties are plain JSON.
- A node's `location` is its canonical URI: relative to the schema resource
  that contains it, not the document.
- Embedded resources stay in the tree. Each resource gets a
  `JsonSchemaDocumentNode` whose root is the same node object. Every resource
  in a document shares one `embedded` map that includes all of them,
  including the root.
- Only a reference from the same document (`referencedFrom`) finds an
  embedded resource, so `compile` can't start from one. `JsonSchemaSession`
  overrides browser's `getDocument` to do that, and browser knows nothing
  about embedding. If two documents embed a resource with the same URI,
  references from it find the resources alongside it in whichever document
  was retrieved first. An embedded resource takes precedence over a cached
  document with the same URI.
- Anchors and dynamic anchors are recorded per resource as JSON Pointers.
  2019-09's `$recursiveAnchor: true` is a dynamic anchor named `""`. The
  schema media type plugin's `fragmentPointer` looks anchors up, so browser
  doesn't know about them either. Every resource's `mediaType` is
  `application/schema+json`, so that works for embedded resources browser
  didn't parse.

## Keywords (`src/keyword.d.ts`)

Keywords are plain, stateless objects so one definition can be shared by
every `JsonSchema` instance and every dialect. Anything instance-specific
should come through a context argument. (Classes with constructor injection
were considered. See "Open questions".)

- `uri`: Identifies the keyword independent of its name in any dialect.
- `shape`: Where the value contains schemas, using combinators: `"schema"`,
  `"data"`, `{ array: Shape }`, `{ map: Shape }`, or `Shape[]` (the first
  alternative whose JSON type matches). A value that doesn't match is data.
- `schema`: The schema for the keyword's own value, used for schema
  validation. It's the schema itself, not a URI. It's identified by the
  keyword's `uri`, so it doesn't need an `$id`, and one that has an `$id`
  must use the keyword's URI. It's required, even for a keyword that allows
  any value. It doesn't describe subschemas; those are validated as
  schemas. It declares its dialect with `$schema` (see "Schema
  validation").
- `resolve`: An optional hook for keywords that identify schemas (`$id`,
  `$anchor`, `$dynamicAnchor`, legacy `id`/`$id`/`$ref`, `$recursiveAnchor`)
  or define dialects (`$vocabulary`). It records effects (`setBaseUri`,
  `addAnchor`, `addDynamicAnchor`, `setReference`, `defineDialect`) that are
  applied after every keyword in the schema has been seen, so keyword order
  doesn't matter. `setReference` makes the schema a
  reference node and discards everything else in it, including messages.
- Draft-specific identifier rules live in keyword definitions, not the core.
- `$schema` and unknown keywords are part of every dialect. The resolver maps
  `$schema` by name, and any other name the dialect doesn't define is
  unknown. Both definitions are added to every `JsonSchema` by default and are
  ordinary keywords otherwise. The unknown keyword can be replaced.

## Dialects (`src/dialect.d.ts`)

- A dialect is `{ uri, keywords, unknownKeywords }`. `keywords` maps names to
  keyword URIs. The core has no vocabularies. A dialect is one flat map of
  keywords, and vocabularies are only how `$vocabulary` builds one. `unknownKeywords` is `"error"` (v1), `"annotation"` (2019-09,
  2020-12), or `"ignore"` (draft-04 through draft-07).
- There's no default dialect unless the user sets `defaultDialectUri` in the
  config. Otherwise, a schema whose dialect can't be determined is an error.
  The dialect comes from `$schema`, then the containing resource, then the
  `schema`/`profile` media type parameter, then the config.
- `$schema` is only allowed where a schema resource starts. Anywhere else,
  it's ignored with a message and the parent's dialect is used.
- Defined dialects can't be replaced. `removeDialect` must be called first.
- `extendDialect(uri, { keywords, formats })` adds keywords and formats to
  a defined dialect. That's how users add custom keywords and formats to v1.
  It can't replace either. Dialects are never changed in place.
- Formats work like keywords. A format definition (`{ uri, validate }`,
  `src/format.d.ts`) is stateless and added to a `JsonSchema` with
  `addFormat`. A dialect maps format names to format URIs (`formats`), and
  says whether `format` validates by default (`assertFormats`). The
  `validateFormats` config overrides that. When formats are validated, a
  format the dialect doesn't have, or whose definition hasn't been added,
  is an error when the schema is compiled. Otherwise, `format` is only an
  annotation, so any name is fine. draft-04 through draft-07 have their own
  `format` keyword that ignores formats the dialect doesn't have, rather
  than a dialect option for it.
- The lite formats (`src/formats/lite.js`) are every format JSON Schema
  defines except `hostname`, `idn-hostname`, and `idn-email`, which need large
  tables of Unicode data. Every `JsonSchema` has them, and v1 validates
  formats by default. `src/formats/full.js` adds the rest. The validators come
  from `@hyperjump/json-schema-formats`.
- Keyword names starting with `x-` are reserved for schema authors in every
  dialect. They're guaranteed to never collide with a keyword, so they must
  never assert. Registering one throws (`addDialect`,
  `extendDialect`), and so does a meta-schema defining a dialect with one. They're always allowed in schemas, even when unknown
  keywords are errors, and then they're annotations (v1).
- A meta-schema can define a dialect. A resolve hook calls
  `defineDialect` with the dialect without its URI (`DialectDefinition`),
  and the resolver records it on the schema resource
  (`JsonSchemaDocumentNode.definedDialect`). It's only allowed where a schema
  resource starts. Anywhere else, it's ignored with a message.
- `$vocabulary` was removed in v1 but is still supported for 2019-09 and
  2020-12. The core doesn't know about it or about vocabularies. The
  `$vocabulary` keyword (`src/keywords/vocabulary.js`) knows a map of
  vocabulary URIs to vocabularies (`{ keywords, formats, assertFormats }`).
  Its hook merges the listed vocabularies into one dialect, with unknown
  keywords as annotations. Formats assert if any listed vocabulary says so,
  which is how 2020-12's format-assertion vocabulary works. A required
  vocabulary the keyword doesn't know is a problem with the meta-schema,
  reported on the vocabulary's URI, so the meta-schema can't be used.
- `addVocabulary(jsonSchema, uri, vocabulary)`, defined with the keyword, adds
  a vocabulary by replacing the `JsonSchema`'s `$vocabulary` keyword with one
  whose map has it too. Keyword definitions never change, so it's still per
  instance. 2019-09 and 2020-12 share the keyword, because `$vocabulary`
  means the same thing in both and their vocabulary URIs don't overlap. So a
  vocabulary is added once and works in every dialect that has
  `$vocabulary`, and vocabularies added by different code compose. The
  presets add their vocabularies with it too, and they export it. Users get
  it from a preset, not from the keyword's module, which isn't public.
- A dialect that isn't defined is the one its meta-schema defines.
  `JsonSchemaSession.getDialect` gets the meta-schema with `getDocument`, so
  it can come from a registry, and it must be a schema. The dialect is
  identified by the URI it was asked for, which can be any URI the
  meta-schema is found by. It's cached in each session that uses it, because
  that's where the URI it was asked for is known. A dialect that's already
  defined isn't replaced.
- A self-describing meta-schema (its `$schema` is the URI it was retrieved
  from) can't define its own dialect, because the dialect is needed to find
  out what it defines. Its dialect has to be added, which the presets do for
  2019-09 and 2020-12. Custom meta-schemas normally use `$schema` for one of
  those, so they still define their dialects. Meta-schemas that depend on
  each other are detected with `getDialect`'s `referencedFrom` option instead
  of waiting forever.

## Schema validation

v1 is designed to evolve compatibly, which is why it doesn't allow unknown
keywords. There's no static v1 meta-schema. What's valid depends on what the
implementation supports, including user-defined keywords, which can't change
an internal meta-schema.

- Schema validation is keyword by keyword, for every dialect. Schemas are
  never validated against a meta-schema.
- Unsupported keywords are reported by the resolver according to the
  dialect's `unknownKeywords`.
- Each keyword's `schema` validates its value.
  `jsonSchemaValidateKeywords` is a unified plugin that runs after
  `jsonSchemaResolve`. The schema media
  type plugin runs it unless the `validateSchemas` config is `false`. It
  validates each keyword's value node with `Validator.validateNode`. An
  invalid value gets one message, placed on the value, with the keyword's URI
  as the `ruleId` and the keyword schema's BASIC errors as its `cause` (an
  `AggregateError`).
- `addKeyword` adds the keyword's schema to the `JsonSchema`'s internal
  registry (see "The internal registry"), so it's found by the keyword's
  URI like any other schema. The built-in keywords' schemas are
  `.schema.json` files next to the keywords, imported as JSON. Being files
  lets tooling like a language server or a CI check validate them, since
  they aren't validated themselves. Every keyword has one, even if it
  allows any value.
- The built-in keyword schemas declare their dialect with `$schema`.
  They're written in v1, so every `JsonSchema` has the v1 dialect,
  keywords, and lite formats, like it has `$schema` and the unknown keyword.
  Keyword schemas aren't validated themselves, because validating one could
  need itself.
- Dialect schemas (meta-schemas) are for dev-time tooling, not validators.
  There's no generated "what this implementation supports" meta-schema.
- A schema that wasn't retrieved from a `file:` URI can't be identified by
  one, in every dialect. Its references would be resolved as if it were a
  file, which would get around browser's rule that only files can reference
  files. v1 had the same rule for registered schemas.
- The resolver's own checks (misplaced `$schema`, duplicate ids and anchors,
  invalid identifiers, `file:` identifiers) are schema validation too.
  Every problem is a
  `VFileMessage` with `source: "json-schema"` and a `ruleId`. Messages from a
  keyword hook use the keyword's URI as the `ruleId`.

## Sessions and registries

Implemented. `JsonSchema` used to be a `Hyperjump` with one
document cache for its whole life. That's what made registries hard: a
registry for one compilation would be visible to compilations running at the
same time, and nothing could be removed without leaving resolved documents
behind that depended on it. The fix is to separate state by how long it
lives.

### Two levels

Both libraries have a long-lived object and sessions created from it, and
`JsonSchema` extends each level:

| Level | Browser | JSON Schema adds |
| --- | --- | --- |
| Long-lived | `Hyperjump`: URI scheme and media type plugins, the HTTP cache | keywords and their schemas, formats, dialects, output formats, instance registries |
| Session | `Session`: document cache, `get`, `step`, …, following references | session registries, the embedded index, `compile` |

- The long-lived level only has state that doesn't depend on a session.
  Plugins, HTTP responses, and definitions are the same for every session.
  Anything that depends on registries, including every resolved document,
  belongs to a session and goes away with it, so nothing is ever left
  behind.
- `Hyperjump.session()` creates a session. `JsonSchema` overrides it to
  create a `JsonSchemaSession`. There's no default session. Browsing
  (`get`, `step`, …) is only on sessions, because a node needs its session to
  follow references.
- `JsonSchema.compile(uri, { registries })` creates a session for that
  compilation. Compilations that run at the same time each have their own
  session, so they can't see each other's registries. A `Validator` doesn't
  need its session after compiling, because its IR is self-contained.
- The `getDocument` override and the embedded index (see "Schema AST") are
  on `JsonSchemaSession`.
- `JsonSchema.compile(uri)` compiles in a new session, so each compilation
  sees changes. `JsonSchemaSession.compile` compiles in that session.
- Dialects from `addDialect` belong to `JsonSchema`, and its `getDialect`
  only finds those. A dialect built from a meta-schema belongs to the
  session that built it. `JsonSchemaSession.getDialect` finds both, and it's
  what the resolver and the compiler use.
- Browser gives a media type plugin the session a document is being
  retrieved in (`parse(response, session)`), so the schema media type plugin
  resolves schemas in that session. Retrieving a schema in a plain `Session`
  is an error.

### HTTP cache (browser)

- Retrieved responses go in an HTTP cache, according to their caching
  headers. It's under the URI scheme plugins and stores responses, not
  documents, so it doesn't depend on dialects or registries and is shared by
  every session.
- It's part of `HttpUriSchemePlugin` (a `cache` option), because caching
  headers are HTTP's. It uses `http-cache-semantics`, as a private cache.
  A stale response with an `ETag` or `Last-Modified` is revalidated. A 304
  that doesn't match the cached response is retried without revalidating.
- The store is pluggable (`HttpCacheStore`): `MemoryHttpCacheStore`, the
  default in Node.js, or `FileHttpCacheStore`, which outlives the process.
- In a browser, `fetch` already respects caching headers, so there's no
  cache by default.
- A session's document cache keeps it from retrieving the same resource
  twice. Sessions retrieving the same URL at the same time share one
  request.
- `file:` responses aren't cached, so each new session reads files again.

### Registries (`SchemaRegistry`)

A registry holds schemas that aren't retrieved from a URI. It's separate
from `JsonSchema` so one registry can be shared by several `JsonSchema`s and
sessions. Registries are edited only through their own methods. A
`JsonSchema` only reacts to the changes.

```ts
class SchemaRegistry {
  add(schema: Json | string, options?: { retrievalUri?: string; dialectUri?: string }): void;
  remove(retrievalUri: string): void;
}
```

Implemented in `src/schema-registry.js`, with each `JsonSchema`'s index of a
registry in `src/registry-index.js`. The state a registry shares with its
indexes is in `src/registry-state.js`, which isn't exported.

- A schema is identified the way JSON Schema identifies it: by its `$id`
  (or `id` in draft-04), resolved against `retrievalUri`, or by
  `retrievalUri` if it has no `$id`. Only the root resource is indexed.
  Embedded resources are only found from the same document.
- A schema is also found by its `retrievalUri`, like a retrieved schema is
  found by the URI it was retrieved from. A reference to a schema by where
  it lives works even if the schema has a different `$id`, which the
  JSON-Schema-Test-Suite tests and a language server needs for references
  by relative path. Its `$id` is still its canonical URI, so locations use
  it.
- A schema can't be identified, or have a `retrievalUri`, that's a
  keyword's URI. That's a keyword's schema.
- `remove` takes the `retrievalUri`. A schema added without one can't be
  removed, and removing a `retrievalUri` that isn't there does nothing.
  Adding a `retrievalUri` that's already in the registry throws, so an edit
  is `remove` then `add`.
- `retrievalUri` can be a `file:` URI, because the code calling `add` is
  trusted. The resolver's rule that only a schema retrieved from a `file:`
  URI can be identified by one still applies.
- Registries are attached three ways: the `registries` config,
  `addRegistry`/`removeRegistry` on `JsonSchema`, and session registries
  (`session({ registries })`, `compile(uri, { registries })`).
- Lookup order is: embedded resources, the internal registry, session
  registries, instance registries, then browser (the session's cache, the
  HTTP cache, a URI scheme plugin). Two entries with the same URI in one
  registry are an error when the second is added. Two in different
  registries that a session sees are an error when the URI is looked up,
  which only costs checking each registry's index.

### Identification

Identity depends on the dialect, so a registry can't index its own
entries. Each `JsonSchema` indexes each registry it's used with.

- Every `JsonSchema` a registry is used with identifies an entry when
  it's added. Identification is synchronous: it gets the dialect and runs
  only the root's resolve hooks (`identify` in `src/registry-index.js`).
  Full resolution comes later, separately.
- If any `JsonSchema` finds a problem, such as a duplicate `$id`, `add`
  throws (an `AggregateError` if there's more than one) and the entry isn't
  added.
- An entry's dialect is one added to the `JsonSchema` or one defined by
  another entry in the same registry (its root's `defineDialect` effect).
  Only the same registry, because an index doesn't depend on which other
  registries a session sees. A schema in a registry that uses a
  `$vocabulary` dialect needs that dialect's meta-schema in the same registry
  or added with `addDialect`.
- An entry identified with another entry's dialect can't be seen before
  that entry: its version is the later of the two. Removing the meta-schema
  identifies its dependents again at that version, so sessions that could
  see the meta-schema keep seeing them as they were. Replacing it (`remove`
  then `add`) identifies them again with the new one.
- An entry whose dialect isn't defined yet waits in a list by dialect URI.
  Nothing is retrieved to identify an entry. Waiting entries are tried
  again when an entry that defines a dialect is added and when a lookup
  misses, so a dialect added with `addDialect` later is picked up. The
  dialects they're waiting for are in the error when the lookup fails.
- A session sees a dialect defined by an entry exactly when it sees the
  entry, because the dialect comes from the entry's resolved document.
  Removing the entry removes the dialect.
- Full resolution is lazy, the first time a session asks for the entry.
  Problems are thrown as fatal messages then, as they are for a retrieved
  schema.

### Making sessions cheap

Creating a session takes O(1) per registry, however large the registry is.

- An entry never changes after it's added, so everything derived from it is
  cached once per `JsonSchema` (a `WeakMap` keyed by the entry) and shared by
  every session: its identification and, lazily, its resolved document. A
  resolved document is only shared if every resource in it uses a dialect
  added to the `JsonSchema`. One that used a dialect only its session had
  belongs to that session.
- A `JsonSchema` keeps an index for each registry (URI to entry), updated as
  the registry changes. Sessions point at the indexes. They don't build
  anything.
- Sessions see a snapshot of each registry without copying it. A registry's
  version goes up on every `add` and `remove`. Each index entry records the
  version it was added in and the version it was removed in. A session
  records each registry's version when it's created and only sees entries
  that existed at that version. A URI rarely has more than one or two
  versions, so lookups stay O(1). A removed entry is dropped once no open
  session can see it. Each index counts open sessions per version, and a
  `FinalizationRegistry` closes a session when it's garbage collected.
  Sessions can't be closed explicitly.
- Registries hold their indexes weakly, and each `JsonSchema` holds its
  indexes in a `WeakMap` keyed by registry, so a registry that was only
  used for one session can go away.
- A session registry costs the same as an instance registry. Its entries are
  identified the first time it's used with a `JsonSchema`, and every session
  after that is O(1).
- What a session still builds itself is its document cache and embedded
  index for what it actually uses, plus anything that depends on a dialect
  only that session has.
- A cached resolved document reflects the definitions when it was resolved.
  A later `addKeyword` or `extendDialect` doesn't change it, as with any
  schema that's already been resolved.

### The internal registry

- Every `JsonSchema` has a `SchemaRegistry` for its keywords' schemas, so
  there's only one way schemas are stored. `addKeyword` adds the keyword's
  schema with the keyword's URI as its `retrievalUri`, and replacing a
  keyword replaces its schema (`remove`, then `add`). Custom keywords' schemas
  work the same way, so they don't have to be served from anywhere.
- It's checked right after embedded resources and can't be removed. Another
  registry can't have a schema that's identified by, or retrieved from, a
  keyword's URI.
- Its index is built the first time a session needs it, so a `JsonSchema`
  that's never used doesn't identify every keyword schema. That's about
  0.5 ms for the built-in keywords.
- Keyword schemas use only dialects added to the `JsonSchema`, so each is
  resolved once and shared by every session, like other registry schemas
  that do. Their validators are cached for each keyword definition, so a
  replaced keyword's schema is compiled again.
- Nothing from the internal registry is validated (see "Schema
  validation"). A schema from any other registry or retrieved is.
- Keyword schemas don't depend on `import.meta.url`, so they work in
  browsers and with bundlers.
- Every preset adds a registry with its meta-schemas, so they're never
  retrieved. Each is one `SchemaRegistry`
  shared by every `JsonSchema` the preset is added to. Each `JsonSchema`
  identifies the entries itself.

### The language server

- Workspace schemas with an `$id` go in an instance registry with their
  `file:` URI as the `retrievalUri`. An edit is `remove` then `add`.
- Schemas without an `$id` are retrieved from their `file:` URIs. Files
  aren't HTTP cached, so a new session sees the edits.
- A new session for each change to the workspace sees a consistent snapshot,
  and the old one is dropped. Validators compiled in an old session have to
  be compiled again. The URIs a validator was compiled from (its IR's keys)
  could be exposed for that.

## Validation API (`src/json-schema.d.ts`)

Implemented in `src/validator.js`.

- `compile(uri)` returns a `Validator` with `validate`, `validateJson`,
  `annotate`, and `annotateJson`. `JsonSchema` has the same four as
  convenience methods that take a URI.
- `validate` never builds an AST. `annotate` validates and returns the
  instance as an AST, so users never need to call both. Each has a `Json`
  variant for text, which includes syntax errors with the validation errors.
  A JSON string is also a valid instance, so the variants can't share a
  function.
- FLAG output is a plain `boolean` to avoid allocating. BASIC and DETAILED are
  `{ valid, errors }`. Output formats are typed with an augmentable
  `OutputFormats` interface. A new output format spec is in progress and
  should be supported eventually.
- Errors are `VFileMessage`s. Validation errors add keyword location,
  absolute keyword location, and instance location. Text input adds
  positions. Any syntax error makes the instance invalid, but it's still
  validated as far as it could be parsed.
- Validation errors are created with `Error.stackTraceLimit` set to 0.
  `VFileMessage` replaces the stack with an empty string anyway, but the
  `Error` constructor still captures one, which made collecting errors
  about 5 times slower. Plain objects would be a little faster still, but
  then errors wouldn't be `VFileMessage`s like syntax errors are, and they'd
  have to be converted to be reported through a `VFile`.
- `annotate` returns `{ output, status, node }`. Annotations are
  `node.data.annotations`, a `Map` of annotation keyword URI to values.
- In a broken (error-tolerant) tree, keywords skip `json-missing` and
  `json-invalid` nodes, and `required` counts a property with a missing value
  as present, so the syntax error is the only error for it.
- Extra information for the language server (schema locations, evaluated
  branches) will come from evaluation plugins.

## Compile and evaluate (`src/keyword.d.ts`)

Implemented in `src/compile.js` (the IR) and `src/specialize.js`, with the
instance operations in `src/instance.js`. Requirements: fast on plain JS values, exact
error locations, and extensibility (user keywords and plugins can run
arbitrary code) can't be traded away for speed.

There are two phases:

1. **Compile** (async, once per `Validator`). Walk the schema AST from the
   entry URI, retrieving referenced schemas with `get`. The result is an IR:
   a table of schema canonical URI to a boolean or a list of
   `[keywordUri, absoluteKeywordLocation, compiledValue]`, plus each schema's
   resource. Subschemas are referenced by URI, so cycles are fine. It's v1's
   compiled AST, but built from schema AST nodes. All I/O happens here.
2. **Specialize** (sync, lazy). Turn the IR into closures for one combination
   of instance representation (plain JS values for `validate`, AST nodes for
   everything else), whether annotations are collected, and whether there
   are plugins (see "Plugins"). Each combination is built the first time
   it's needed and cached on the `Validator`. No `eval`.

The IR is where optimization passes can go later. It's JSON, so a compiled
schema can be serialized (`Validator.serialize`,
`JsonSchema.restoreValidator`). That means a keyword's compiled value must be
JSON.

Keywords:

- `compile(valueNode, context)` returns the compiled value. Without it, the
  compiled value is the keyword's value. `context.compileSchema` compiles a
  subschema node or a URI and returns a handle (the canonical URI). Sibling
  keywords are found through `context.schemaNode`.
- `evaluate(compiled, context)` returns `(instance) => boolean`. It runs once
  per specialization, so instance-independent work goes there. A keyword
  without `evaluate` has no effect on evaluation (`$id`, `$anchor`).
- Keywords are written once for every instance representation. They look at
  instances through `context.instance` (`InstanceOps`: `typeOf`, `value`,
  `length`, `has`, `get`, `entries`, `keys`, `items`), which is fixed for a
  specialization. `keys` gives property names as instances (name nodes in an
  AST) for `propertyNames`, so their annotations go on the names. `typeOf` is
  undefined for `json-missing` and `json-invalid` nodes, and `has` is true for
  a property whose value is missing. That's how keywords get the
  error-tolerance rules without extra code.
- Applicators evaluate subschemas through `context.schema(handle)(instance,
  segment)`. The core tracks instance location, keyword location (following
  references), and which AST node to annotate, so keywords never build
  pointers. In flag mode, the segment is ignored.
  The step from a keyword to a subschema comes from their canonical URIs. A
  subschema whose URI isn't under the keyword's has its step from the schema
  recorded in the IR at compile time instead. That's one with an `$id`, or
  one in a sibling keyword's value. That lets `if` evaluate `then` and
  `else` itself, so the `if` subschema is only evaluated once, while their
  errors keep their own keyword locations. A schema compiled from a URI is a
  reference and doesn't get a step.
- Evaluation state (frames, locations, dynamic scope, plugins) lives in the
  specialization's closure instead of being passed through every call. An
  evaluation started from inside another one, such as by a plugin, saves the
  outer one's state and restores it. The fastest specialization doesn't use
  any state, so it doesn't save anything.
- `context.annotate` is only defined when annotations are being collected.
  Annotations are buffered in frames (see "Evaluation state").
- Unknown keywords: the core looks up the definition by `keywordUri` without
  its fragment and passes the property name as `context.keywordName`. The
  unknown keyword's `compile` uses `context.dialect.unknownKeywords` to decide
  whether it's an annotation.

`validateJson` and `annotateJson` parse with browser's error-tolerant
`fromJson` and then evaluate the AST. Validating while parsing is a possible
optimization later. The two-phase design doesn't rule it out.

Sharing one keyword implementation between representations might make call
sites polymorphic, because V8 may share type feedback between closures
created from the same code. The benchmark (see "Benchmark") shows it does:
`validate` is about 15% slower in a process that has also evaluated ASTs.
Keywords could optionally provide a separate evaluator for plain values.
That would be an addition to the interface, not a redesign.

Annotations follow the spec: they're kept only if the keyword and every
schema they were evaluated through pass. An invalid instance gets no
annotations from the failing parts of the schema. The language server has its
own annotation implementation for that reason. Alternative annotation
behavior should be explored later.

### Evaluation state

Cross-cutting keywords don't use plugins. v1 implemented `unevaluated*` and
`$dynamicRef` as plugins, which put every evaluation through hook wrappers.
Here, the core tracks two kinds of state, each only when a keyword in the IR
declares that it reads it (`Keyword.reads`):

- **`evaluated`**: The properties or items evaluated at an instance location.
  Applicators (`properties`, `patternProperties`, `additionalProperties`,
  `prefixItems`, `items`, `itemPattern`, `contains` for matching items, and
  `unevaluated*`) call `context.markEvaluated?.(key)`. Readers
  (`unevaluated*`) call `context.evaluated()` and are evaluated after their
  siblings that don't read it, which replaces v1's hard-coded keyword order.
  Objects and arrays share one set because an instance can't be both. This
  is a built-in set rather than a general way for keywords to read each
  other's annotations, which would make every reader understand every
  producer's annotation format.
- **`dynamicScope`**: `context.dynamicAnchor(name)` returns the evaluator for
  the outermost schema in the dynamic scope with that anchor. The core
  updates an anchor-to-evaluator map when evaluation enters a different
  schema resource, reusing the outer map when the resource adds nothing.
  Bookending (2020-12) and `$recursiveAnchor` (2019-09) are up to the
  keyword. `context.resourceDynamicAnchors(uri)` gives it a resource's
  dynamic anchors from the IR, so it can check whether the schema a
  reference resolved to has one. It's checked in `evaluate`, once per
  specialization, because the IR is only complete then. Checking while
  compiling would miss an anchor whose schema is still being compiled, like
  `meta/core`'s `"meta"` from a `$dynamicRef` inside it. Compiling any schema in a resource also compiles that resource's
  dynamic anchor targets, because specialization can't retrieve anything.

Scoping is the core's job. Each keyword and schema evaluation gets a frame
for its marks and annotations, which follow the same rule, as the spec does
for annotations: a frame is kept only if it passes. A subschema evaluated on
the same instance (no `segment`) merges its frame into its parent's. One
evaluated on a property or item gets its own, because its marks are about a
different instance. Frames only exist while marks or annotations are being
collected.

Because only passing schemas keep marks, a keyword can always stop at a
failure. It must not stop at a passing subschema while `markEvaluated` is
defined. `context.exhaustive` is true when errors or annotations are being
collected, and then nothing may stop early.

### Plugins (`src/evaluation-plugin.d.ts`)

Plugins only observe evaluation. Nothing built in needs to change it. They're
passed per call (`ValidationOptions.plugins`) and are usually stateful
objects the caller reads results from afterwards.

- Hooks are `beforeSchema`, `afterSchema`, `beforeKeyword`, and
  `afterKeyword`. State is passed explicitly instead of through v1's shared
  context object: each `before` hook returns the plugin's state for that
  evaluation, which the core gives to the matching `after` hook and to what's
  evaluated inside it (a schema's state to its keywords, a keyword's state to
  the subschemas it applies). The core keeps the stack. That's enough to
  build nested results like DETAILED without touching shared objects.
- Hooks get a `SchemaInfo` or `KeywordInfo`, created once per specialization
  so passing it doesn't allocate, and an `EvaluationLocation` with the
  instance location, the keyword location (following references), the AST
  node when there is one, and a lazy `value()`.
- With any plugin, the instance is evaluated once with `exhaustive` on. A
  plugin never sees an instance twice (coverage counts) and always sees every
  keyword that applies. That makes plugins slower, which is the trade-off.
- Validators are specialized on whether there are plugins, not on which
  ones. Plugins are often created fresh for each call, so a cache keyed by
  plugin set would miss every time. The instrumented specialization loops
  over the call's plugins and calls the hooks they have. Grouping them by
  hook, like v1's `pluginHooks`, is a possible optimization. That makes at most four specializations per representation: fast,
  instrumented, annotate, and annotate with plugins (annotate is AST only).

### Output formats

- FLAG is built in. It runs the fast closures and allocates nothing.
- Every other format is an `OutputFormatDefinition` registered with
  `addOutputFormat` and typed through the `OutputFormats` interface. It
  returns a plugin and an `output(valid, syntaxErrors)` function for each
  evaluation, so every format can include syntax errors. BASIC
  and DETAILED are registered by default. The output format being developed
  for the next spec release will be another one.
- Without user plugins, an instance is evaluated with the fast closures
  first, and the format's plugin only runs on a second evaluation if the
  instance is invalid. Valid instances never pay for error collection. With
  user plugins, there's one instrumented evaluation that includes the
  format's plugin.
- BASIC doesn't give an error of its own to a keyword whose failure is fully
  explained by its subschemas' (`Keyword.simpleApplicator`, as in v1). The
  core can't infer it: a failing `oneOf` isn't explained by its subschemas.
- A failing condition (the `if` subschema, or a condition of
  `conditional`) only decides which subschema applies, so BASIC and DETAILED
  don't report its errors. They recognize these two keywords by URI. It's a
  special case on purpose, rather than something a keyword can declare, so
  keywords aren't encouraged to depend on another subschema's result.
- The built-in formats give errors a generic `reason` that names the
  keyword. Explaining errors is left to other output formats, such as
  `json-schema-errors`, so messages aren't part of the keyword interface.

## Benchmark

The benchmark is ported from `@hyperjump/json-schema`'s and isn't committed.
It compares implementations over the v1 test cases of the
JSON-Schema-Test-Suite, and over the draft-07, 2019-09, and 2020-12 test
cases, which json-schema-next evaluates with those presets. Test cases
tagged for `format` are left out. A test case that any implementation gets
wrong is left out for every implementation. In draft-07, 2019-09, and
2020-12, json-schema-next only gets the two `file:` `$id` test cases
wrong, which it rejects on purpose. In draft-07, `@hyperjump/json-schema`
also gets two legacy `$id` test cases wrong. json-schema-next and
`@hyperjump/json-schema` both validate draft-07 formats by default, but
the untagged test cases only use `format` on values that aren't strings,
which `format` skips.

Results (mean time per run of the suite, FLAG unless it says errors):

| | json-schema-next | `@hyperjump/json-schema` |
| --- | --- | --- |
| v1 | 0.26–0.28 ms | 0.75 ms |
| v1, after evaluating ASTs | 0.31–0.33 ms | 0.75 ms |
| v1, all errors | 1.52–1.54 ms | 1.35–1.36 ms |
| draft-07 | 0.12 ms | 0.29 ms |
| draft-07, all errors | 0.77–0.78 ms | 0.62–0.63 ms |
| 2019-09 | 0.29 ms | 0.76–0.79 ms |
| 2019-09, all errors | 1.64–1.80 ms | 1.43–1.47 ms |
| 2020-12 | 0.30 ms | 0.84–0.85 ms |
| 2020-12, all errors | 1.78–1.83 ms | 1.53–1.63 ms |

- FLAG is about 2.7–2.9 times faster than `@hyperjump/json-schema` in v1,
  about 2.4 times faster in draft-07, about 2.7 times faster in 2019-09,
  and about 2.85 times faster in 2020-12.
- `validate` is about 15% slower in a process that has also evaluated
  ASTs, because keyword code is shared (see "Compile and evaluate").
- Collecting errors (BASIC) is about 1.13 times slower than
  `@hyperjump/json-schema` in v1, about 1.24 times slower in draft-07,
  about 1.15–1.22 times slower in 2019-09, and about 1.12–1.16 times
  slower in 2020-12. It was about 5 times slower until errors stopped
  capturing stack traces (see "Validation API").
- `@exodus/schemasafe`, which generates code, is the fastest at collecting
  errors. It's about 10 times faster than json-schema-next in draft-07,
  about 6.8–7.3 times faster in 2019-09, and about 4.6–4.7 times faster in
  2020-12.
- With the `format` test cases, format validators take most of the time,
  and FLAG is only about 1.4 times faster.

## Open questions

- **Where keywords get their dependencies.** From a context argument
  (stateless, shareable keywords; current lean, and what `CompileContext`
  does) or constructor injection (matches browser's plugins).
- **`multipleOf` precision.** It uses v1's fixed tolerance for the
  remainder, which is wrong for very small divisors.
- **Annotations for invalid instances.** The spec drops annotations from
  failing schemas, which leaves the language server without them. Explore
  alternative annotation behavior.

## Status

Done:

- Project setup (`oxlint`, `vitest`, `tsc` with declaration files checked,
  `typedoc`).
- Validation API types.
- Keyword compile and evaluate types, and the two-phase design.
- Evaluation state for `unevaluated*` and `$dynamicRef`.
- Evaluation plugin and output format types.
- Schema AST, keyword, and dialect types.
- `jsonSchemaResolve`, `JsonSchema` registries, and the schema media type
  plugin, with tests.
- Compile (the IR, serialization), specialize (fast, instrumented, and
  annotating evaluators for plain values and ASTs, evaluation state, frames,
  plugins), the `Validator`, BASIC and DETAILED, and the runtime error
  classes, with tests that use keywords defined in the tests.
- The unknown keyword is an annotation in dialects whose `unknownKeywords` is
  `annotation`.
- Keyword definitions with resolve hooks: `$schema`, unknown, `$id`,
  `$anchor`, `$dynamicAnchor`, draft-04 `id`/`$ref`, 2019-09
  `$recursiveAnchor`, and `$vocabulary` (with `addVocabulary`), which
  defines dialects in the resolver, in sessions, and in registries.
  Other keywords only need shapes and schemas, so they'll be added with the
  compile side.
- The v1 dialect (`src/v1`) is built into every `JsonSchema`. It used to be
  added with `addV1`. The JSON-Schema-Test-Suite (its `unify`
  branch, which will replace `main`) runs in
  `src/v1/json-schema-test-suite.test.js`. v1 is the suite's `9999`. One
  `JsonSchema` runs every test case. Each test case's schema and
  `externalSchemas` are in a session registry, which keeps test cases from
  seeing each other's schemas, and `http(s):` is removed so nothing is
  retrieved. Each test is checked with
  `validate`, `validateJson`, BASIC, and `annotate`. Files for keywords that
  don't exist yet are skipped.
- The v1 dialect includes the `propertyDependencies` proposal, and the
  suite's proposal tests run too. `conditional`, `itemPattern`, and
  `requireAllExcept` are added too, but with `extendDialect` as a reminder
  that they aren't full proposals yet. Their tests are in
  `src/v1/extension-tests`, ported from v1 except for `requireAllExcept`,
  which v1 didn't have tests for.
- The validation keywords (`type`, `const`, `enum`, the numeric, string,
  array, and object assertions, `required`, `dependentRequired`, and
  `requireAllExcept`) and `$comment`. Their test suite files pass, except
  test cases that need applicators.
  Equality (`const`, `enum`, `uniqueItems`) compares through
  `InstanceOps`, so an AST isn't copied. A value that couldn't be parsed
  counts as equal for `const` and `enum` and as different for
  `uniqueItems`, so it never causes an error of its own.
- The applicators. Keywords
  that depend on a sibling (`additionalProperties`, `items`, `contains`, and
  `if`) read it from the schema AST when they're compiled. `then`, `else`,
  `minContains`, and `maxContains` have no effect on their own. Compiled
  maps of schemas are `[name, handle]` pairs because a name like
  `__proto__` can't be a property of a plain object.
- The meta-data and content keywords are annotations. `contentEncoding`,
  `contentMediaType`, and `contentSchema` only annotate strings, and
  `contentSchema` only annotates if there's a `contentMediaType`. Content
  isn't decoded or validated.
- The suite's annotation tests run in `src/v1/annotation-test-suite.test.js`
  with `annotate` and `annotateJson`. Only annotation values are compared,
  in any order, because annotations don't record the schema they came from.
- In v1, `$dynamicRef` is the name of a dynamic anchor, not a URI. It uses
  the outermost schema in the dynamic scope with that anchor, with no
  lexical fallback. If none is in scope, evaluation throws, because that's a
  problem with the schema, not the instance.

- The 2020-12 preset (`src/draft-2020-12`, `addDraft202012`). It adds
  2020-12's `$dynamicRef`, its vocabularies with `addVocabulary`, its
  dialect, and a registry with the official meta-schemas. Every other
  keyword is shared with v1, including the keyword schemas, which are
  written in v1. `$dynamicRef` resolves like `$ref`, and if the schema it
  resolves to has a dynamic anchor named by the fragment, the outermost
  schema in the dynamic scope with that anchor applies instead. The
  suite's 2020-12 test cases run in
  `src/draft-2020-12/json-schema-test-suite.test.js`. Test cases tagged
  `format-assertion` run with `validateFormats`. The annotation suite runs
  in `src/draft-2020-12/annotation-test-suite.test.js`.
- The 2019-09 preset (`src/draft-2019-09`, `addDraft201909`), built the
  same way. It adds `$recursiveAnchor`, `$recursiveRef`, and its own
  `$anchor`, whose names can contain `:` but can't start with `_`. It also
  adds draft-04's `items`, which is a schema or an array of schemas, and
  `additionalItems`, which only has an effect after an array of schemas.
  They reuse the `items` and `prefixItems` evaluators. `$recursiveRef`
  resolves like `$ref`, and if the schema it resolves to has
  `$recursiveAnchor: true` (the dynamic anchor `""`), the outermost schema
  in the dynamic scope with it applies instead. Both presets can be added
  to one `JsonSchema`. The suite's 2019-09 test cases run like 2020-12's,
  and so do its annotation tests.
- The draft-04, draft-06, and draft-07 presets (`src/draft-04`,
  `src/draft-06`, `src/draft-07`, `addDraft04`, `addDraft06`,
  `addDraft07`). They don't have `$vocabulary`, so each adds a dialect and
  a registry with its one meta-schema. Their dialect URIs don't have the
  empty fragment their `$schema` usually has, because `$schema` is
  resolved to an absolute URI. Unknown keywords are ignored. `$ref` is
  draft-04's, which makes the schema a reference, and `id`/`$id` is
  draft-04's, which can also be an anchor. All three add draft-04's
  `items`, `additionalItems`, and `dependencies`, which is
  `dependentRequired` and `dependentSchemas` in one keyword. draft-04 adds
  `maximum` and `minimum`, which read the sibling boolean
  `exclusiveMaximum` and `exclusiveMinimum`. `format` validates by default,
  as most implementations of these drafts did. Their `format` is
  draft-04's, which makes a format the dialect doesn't have only an
  annotation, as the drafts say. Each dialect only has the formats its draft
  defines, so the draft-04 and draft-06 meta-schemas' `regex` is ignored. draft-04 and draft-06 use draft-04's
  `hostname` (RFC 1123), which doesn't need Unicode data. Every other
  keyword is shared with v1. Their suite and annotation tests run.
- The suite runners share `describeValidationTestSuite` and
  `describeAnnotationTestSuite` in `src/test-suite.js`. Each one gives the
  release, the dialect, the `JsonSchema` to use, and what to skip. The
  annotation runner gets the dialect itself, because the suite names
  keywords and annotations are identified by keyword URI.

Changes made to browser for this (on its `v2` branch):

- A type parameter for property node annotations, and JSON AST utilities that
  are generic over the node type.
- A generic `DocumentNode<T>`.
- Embedding and anchors aren't in browser, because only JSON Schema uses
  them. Every document lookup, including following references, goes through
  `getDocument`, which a subclass can override. A media type plugin's
  `fragmentPointer` defines what fragments identify, and each document
  records the media type of the plugin that parsed it.
- A file's media type uses the longest matching extension.
- `content-type` v3, with the parsed type validated.
- Methods are declared as methods, not function-valued properties, so a
  subclass can override them.
- Sessions, and an HTTP cache in the `http(s):` URI scheme plugin. A media
  type plugin's `parse` gets the session.
- `getDocument` gets the document a URI identifies, for what it has beyond
  its values. Compiling uses it for a resource's dynamic anchors.
- `jsonValue` supports arrays and objects. `Session.value` still doesn't,
  because it would need to follow references.
- Node locations are valid IRIs. Each pointer segment is percent-encoded
  with `appendToLocation` (`@hyperjump/uri`'s new `encodeIriFragment`),
  which produces normalized IRIs, and `get` decodes a fragment before
  following it as a JSON Pointer. The resolver and compiler build locations
  the same way. Keyword and instance locations in output are JSON Pointers,
  so they aren't encoded.

## Plan

1. Implement the v1 keywords (shapes, keyword schemas, compile, and evaluate)
   and a v1 preset. Run the JSON-Schema-Test-Suite. Benchmark whether sharing
   keyword code between plain values and ASTs slows down `validate`. Done.
2. Schema validation with keyword schemas. Done.
3. Sessions and registries (see "Sessions and registries"). In browser:
   sessions and the HTTP cache. Here: `JsonSchemaSession`, `SchemaRegistry`,
   and the internal registry with the keyword schemas, which fixes them in
   browsers. Done.
4. Presets for 2020-12, 2019-09, and draft-04 through draft-07. Done.
5. Later: annotations, bundling, OpenAPI, a CLI, a unified plugin for
   validating JSON files, and migrating dependent projects.

## Known limitations

- `@hyperjump/browser` v2 isn't published, so it's a `file:../browser`
  dependency. `@hyperjump/uri` is `file:../uri` until `encodeIriFragment` is
  published.
- The base URI from a file's path only handles POSIX paths.
- The `JsonSchema` shortcuts (`validate(uri, ...)` and the others) compile the
  schema every time.
- A registry schema whose dialect is only defined by a meta-schema in a
  different registry can't be found.
- Boolean schemas are allowed in draft-04, which didn't have them. A
  boolean where a schema goes is a boolean schema in every dialect.
- A self-describing meta-schema's dialect has to be added. One retrieved
  from a URI other than its `$schema` isn't recognized as self-describing,
  so its dialect is looked up like any other.
