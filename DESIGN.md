# Design

A from-scratch rewrite of `@hyperjump/json-schema` v1 (the `main` branch) built on
[`@hyperjump/browser`](../browser) v2 and [unified](https://unifiedjs.com/).
Most of the same concepts are included, but often reimagined.

This document records the decisions made so far and what's next.
Measurements are in [BENCHMARKS.md](BENCHMARKS.md). The `.d.ts` files in `src/` are the source of truth for the API. They're
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
text ─ rejsonParse ─▶ JSON AST ─ jsonSchemaResolve ─▶ Schema AST ─ (schema validation) ─▶ lower ─▶ kernel ─ optimize ─▶ kernel ─ fast / instrumented ─▶ closures
       (browser)                  (async)                                                  (async)                              (sync, lazy)
```

- `JsonSchema` extends browser's `Hyperjump<JsonSchemaNode>`, and
  `JsonSchemaSession` extends its `Session`. Schemas are retrieved, browsed,
  and compiled in a session (see "Sessions and registries").
- Schemas are retrieved with browser's `get`. The schema media type plugin
  (`application/schema+json`, `.schema.json`) runs `rejsonParse` and
  `jsonSchemaResolve`. Any message from either is fatal there.
- Plain JSON files are never treated as schemas.

### Code map

| Where | What |
| --- | --- |
| `src/json-schema.js` | `JsonSchema`, and the validation API types (`Validator`, …) |
| `src/session.js` | `JsonSchemaSession` |
| `src/keyword.d.ts`, `src/dialect.d.ts`, `src/format.d.ts` | What a keyword, dialect, and format are |
| `src/schema/` | Text to schema AST: the media type plugin, `jsonSchemaResolve`, schema validation, and the schema AST types |
| `src/kernel/` | Schema AST to results: the kernel's expressions (`kernel.d.ts`), `lower` (compiling), the normal form, `optimize`, the evaluators (`fast.js` for plain values without plugins, `instrumented.js` for everything else), `Validator`, instance operations, and evaluation plugin types. See [KERNEL.md](KERNEL.md) |
| `src/kernel/optimizations/` | Optimization passes on kernel expressions, one per file. `index.js` lists them in the order they run |
| `src/output/` | Output formats and validation errors |
| `src/registry/` | `SchemaRegistry`, indexing registries, and how a session finds schemas in them |
| `src/dialects/` | The presets: `v1`, `draft-04` … `draft-2020-12`. Each has the dialect and its tests, including the test suite runners. `add-preset.js` adds a preset's dialect and the definitions it uses |
| `src/keywords/` | Keyword definitions, and `checks.js`, the checks they share for their values |
| `src/formats/` | Format definitions and the lite and full presets |
| `src/bundle/` | Bundling, which embeds referenced schemas in one document, and its tests, ported from v1 |
| `src/lint/` | Lint rules (`rules/`, one per file), the recommended preset, `lintRule`, which applies configuration comments, and the utilities rules share |
| `src/validate/` | `jsonSchemaValidate`, the unified plugin that validates JSON files |
| `src/lint/test-linter.js` | The processor lint rule tests use, which resolves like the CLI |
| `test/test-suite.js` | Runs the JSON Schema Test Suite and the annotation test suite |

- A `.d.ts` next to a `.js` file declares that module's API. One without a
  `.js` file declares a concept (`keyword.d.ts`, `output-format.d.ts`).
- A keyword's or format's path mirrors its URI.
  `https://json-schema.org/keyword/draft-2019-09/items` is
  `src/keywords/draft-2019-09/items.js`. A variant is named after the last
  draft that uses it, so draft-04 uses `draft-2019-09/items`.
- Tests are next to the code they test.

## Schema AST (`src/schema/schema-ast.d.ts`)

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
- A fragment that isn't a JSON Pointer is an anchor. If the resource
  doesn't have it, `fragmentPointer` throws an `AnchorNotFoundError`, so it
  never reaches browser as a pointer that isn't valid.

## Keywords (`src/keyword.d.ts`)

Keywords are plain, stateless objects so one definition can be shared by
every `JsonSchema` instance and every dialect. Anything instance-specific
should come through a context argument. (Classes with constructor injection
were considered. See "Open questions".)

- `uri`: Identifies the keyword independent of its name in any dialect.
- `shape`: Where the value contains schemas, using combinators: `"schema"`,
  `"unappliedSchema"`, `"reference"`, `"data"`, `{ array: Shape }`,
  `{ map: Shape }`, or `Shape[]` (the first alternative whose JSON type
  matches). `"unappliedSchema"` is a schema the keyword doesn't apply
  (`contentSchema`). It's resolved like any schema but isn't compiled.
  `"reference"` is a URI reference (`$ref`, 2020-12's `$dynamicRef`,
  `$recursiveRef`). The resolver gives its node the URI it resolves to as
  `href`, like a schema that's a reference, so lint and bundling find
  references by the AST, without knowing keywords. The shape owns the JSON types of
  what it describes, and the resolver reports a value that doesn't fit. A
  value where the shape says `"schema"` is a schema node even if it isn't an
  object or boolean (`invalid-schema`). Only alternatives are chosen by the
  value. A value that matches none of them, or a map or array that's the
  wrong type, is reported with the keyword's URI as the `ruleId` and is
  data. A `"data"` alternative matches anything, so it hands the rest to the
  keyword's check. Only `itemPattern` uses one, because its operators are
  strings, which a shape can't describe.
- `check`: An optional hook that reports what the shape can't say about
  the keyword's value, like `minLength` being negative or `allOf` being
  empty (see "Schema validation"). Without it, any value that fits the
  shape is allowed.
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
- A `$schema` is read the same way in every dialect, and it's tolerant: the
  URI is normalized and its fragment is dropped before the dialect is
  looked up, so `HTTP://json-schema.org/draft-07/schema` finds draft-07.
  It's lint that reports what's wrong with it (`non-canonical-dialect-uri`,
  `invalid-dialect-uri`), not the resolver. In draft-04 through 2020-12,
  `$schema` identifies both the dialect and the meta-schema. A fragment
  that isn't empty, like `#/$defs/strict`, is fine for the meta-schema,
  which resolves to that subschema, but not for the dialect, which is
  identified without it. The empty fragment is how draft-04 through
  draft-07 meta-schemas identify themselves, and 2019-09 and 2020-12's
  don't use one. Implementations that compare dialect URIs as strings only
  recognize those exact forms. v1 drops the meta-schema role
  (json-schema-org/json-schema-spec#1712): `$schema` only identifies the
  dialect, and it MUST be normalized and have no fragment.
- Defined dialects can't be replaced. `removeDialect` must be called first.
- `extendDialect(uri, { keywords, formats })` adds keywords and formats to
  a defined dialect. That's how users add custom keywords and formats to v1.
  It can't replace either. Dialects are never changed in place.
- Formats work like keywords. A format definition (`{ uri, types, validate }`,
  `src/format.d.ts`) is stateless and added to a `JsonSchema` with
  `addFormat`. `types` is the JSON types the format applies to, so the
  `format` keyword passes other values without calling `validate`, as the
  spec says, and lint can tell which types a format is for. Without it, a
  format applies to every type. There's no `integer`, because the spec says
  a format applies to data model types. A dialect maps format names to
  format URIs (`formats`), and says whether `format` validates by default
  (`assertFormats`). The `validateFormats` config overrides that. When
  formats are validated, a format the dialect doesn't have, or whose
  definition hasn't been added, is an error when the schema is compiled.
  Otherwise, `format` is only an annotation, so any name is fine. draft-04
  through draft-07 have their own `format` keyword that ignores formats the
  dialect doesn't have, rather than a dialect option for it.
- A keyword that reads its siblings' values, like `additionalProperties`
  reading `properties`, declares them in `siblings`, a record of names it
  chooses to keyword URIs. `compile` and `check` get their values by those
  names (`context.siblings`) and have no other way to find a sibling, so
  the declaration can't drift from what the keyword reads. Tools use it
  too, like `mergeable-all-of-schema`. Keywords that read evaluation state
  instead say so with `reads`.
- The lite formats (`src/formats/lite.js`) are every format JSON Schema
  defines except `hostname`, `idn-hostname`, and `idn-email`, which need large
  tables of Unicode data. Presets don't use the list. Each lists the
  formats its dialect uses, which never include those three. v1 validates
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
- Every problem with a schema is found while it's resolved, and a schema is
  always checked. There's no option to skip it. A trusted schema that has
  to start fast can be compiled once and restored with
  `JsonSchema.restoreValidator`, which doesn't resolve anything.
- The shape describes a keyword's structure, and the resolver reports a
  value that doesn't fit it (see "Keywords").
- A keyword's `check` reports everything else about its value. It's code,
  not a schema. Keyword schemas were tried first, but almost all of them
  said "a non-negative integer" or "a string", and they needed an internal
  registry, a validator for each keyword, and v1 in every `JsonSchema`,
  because they were written in v1. Their errors were generic BASIC errors.
  A check's messages are specific ("Expected a non-negative integer") and
  placed on the exact value that's wrong.
- A check runs right after its keyword's value is annotated, so it can see
  which parts of the value are schemas. That's how `itemPattern`'s check
  only looks at what isn't a schema or a group. It isn't called for a value
  that couldn't be parsed, or for keywords a reference ignores.
- The checks keywords share, like `nonNegativeInteger` and `uniqueStrings`,
  are in `src/keywords/checks.js`. They aren't exported.
- `$schema` has no check. The resolver reads it to find the dialect and
  reports what's wrong with it then.
- Dialect schemas (meta-schemas) are for dev-time tooling, not validators.
  There's no generated "what this implementation supports" meta-schema.
- A schema that wasn't retrieved from a `file:` URI can't be identified by
  one, in every dialect. Its references would be resolved as if it were a
  file, which would get around browser's rule that only files can reference
  files. v1 had the same rule for registered schemas.
- The resolver's own checks (schemas that aren't objects or booleans,
  misplaced `$schema`, duplicate ids and anchors, invalid identifiers,
  `file:` identifiers) are schema validation too.
  Every problem is a
  `VFileMessage` with `source: "json-schema"`, a `ruleId`, and `fatal: true`,
  because a schema with a problem can't be used. It's an error that isn't
  thrown, as a lint rule configured as an error is in unified, so the rest of
  the document is still checked. Messages from a
  keyword's shape, `check`, or `resolve` hook use the keyword's URI as the
  `ruleId`.

## Sessions and registries

With one document cache for a `JsonSchema`'s whole life, a registry for
one compilation would be visible to compilations running at the same time,
and nothing could be removed without leaving resolved documents behind that
depended on it. So state is separated by how long it lives.

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

### Request headers (browser)

- Headers to send with `http(s):` requests, such as credentials, are a
  `headers` option of `HttpUriSchemePlugin`, like `cache`, because they're
  HTTP's. There's no `JsonSchema` config for them. Setting them replaces the
  plugin with `addUriSchemePlugin`, and the cache with it.
- It's a function of the URL, `(url: URL) => HeadersInit | undefined`, and
  can be async. Schemas aren't trusted and can name any URL
  `allowRetrieval` allows, so a fixed set of headers would send credentials
  to every origin. A function lets them go only where they belong, and
  lets a token be refreshed.
- `Accept` is always the plugin's, because media type plugins depend on it.
- The headers are in the request the HTTP cache sees, so a `Vary` on them
  is respected, and revalidating sends them too. The cache is private and
  shared by every session, so headers belong to the plugin, not a session.
  Different credentials need different plugins, which don't share a cache.
- A redirect is sent with the same headers. `fetch` drops `Authorization`
  and `Cookie` when it redirects to another origin, but not other headers.
- The CLI doesn't have headers yet. Its settings are a file that's usually
  committed, so credentials would have to come from somewhere else, like
  environment variables.

### Registries (`SchemaRegistry`)

A registry holds schemas that aren't retrieved from a URI. It's separate
from `JsonSchema` so one registry can be shared by several `JsonSchema`s and
sessions. A registry never changes. `with` and `without` return a new one,
so a session's registries are its snapshot of them.

```ts
class SchemaRegistry {
  constructor(entries?: Iterable<{ schema: Json | string; retrievalUri?: string; dialectUri?: string }>);
  with(schema: Json | string, options?: { retrievalUri?: string; dialectUri?: string }): SchemaRegistry;
  without(retrievalUri: string): SchemaRegistry;
}
```

Implemented in `src/registry/schema-registry.js`, with each `JsonSchema`'s
index of a registry in `src/registry/registry-index.js`. A registry's
entries are in `src/registry/registry-entries.js`, which isn't exported. How
a session finds schemas in the registries it sees is in
`src/registry/session-registries.js`.

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
- `without` takes the `retrievalUri`. A schema added without one can't be
  removed, and removing a `retrievalUri` that isn't there returns the same
  registry. Adding a `retrievalUri` that's already in the registry throws,
  so an edit is `without` then `with`. The constructor is for creating a
  registry in one step, like the presets and the test suite do.
- `retrievalUri` can be a `file:` URI, because the code calling `with` is
  trusted. The resolver's rule that only a schema retrieved from a `file:`
  URI can be identified by one still applies.
- Registries are attached two ways: `addRegistry`/`removeRegistry` on
  `JsonSchema`, which every new session sees, and session registries
  (`session({ registries })`, `compile(uri, { registries })`). There's no
  `registries` config, because `addRegistry` covers it.
- Lookup order is: embedded resources, session registries, instance
  registries, then browser (the session's cache, the HTTP cache, a URI
  scheme plugin). Two entries found by the same URI are an
  error when the URI is looked up, whether they're in one registry or
  different ones a session sees. A registry can't check that itself,
  because identity depends on the dialect, and it means a language server
  can have two files with the same `$id` for a moment without an
  exception.

### Identification

Identity depends on the dialect, so a registry can't index its own
entries. Each `JsonSchema` indexes each registry it's used with.

- A `JsonSchema` identifies a registry's entries the first time a session
  looks for a schema in it, not when the session is created, so a session
  that never looks doesn't pay for it. Identification is synchronous: it
  gets the dialect and runs only the root's resolve hooks (`identify` in
  `src/registry/registry-index.js`). Full resolution comes later, separately.
- An entry is parsed with `JSON.parse` to identify it, and only the root
  keywords whose resolve hooks run are made into nodes (with `fromJs`). A
  tree with positions is much slower to build and is only needed for a
  problem, so an entry that has one is parsed again into a tree, and the
  problem has a position (see "Workspace registry" in hjlint's
  BENCHMARKS.md).
- An entry that can't be identified, such as one that isn't valid JSON or
  has an invalid `$id`, is found by its `retrievalUri`, and finding it
  throws the problem, like a retrieved file that can't be parsed. One
  without a `retrievalUri` can't be found, so its problem is reported when
  a lookup misses.
- An entry's dialect is one added to the `JsonSchema` or one defined by
  another entry in the same registry (its root's `defineDialect` effect).
  Only the same registry, because an index doesn't depend on which other
  registries a session sees. A schema in a registry that uses a
  `$vocabulary` dialect needs that dialect's meta-schema in the same registry
  or added with `addDialect`.
- An entry whose dialect isn't defined yet waits in a list by dialect URI.
  Nothing is retrieved to identify an entry. Waiting entries are tried
  again once the rest of the registry is identified and when a lookup
  misses, so a dialect added with `addDialect` later is picked up. The
  dialects they're waiting for are in the error when the lookup fails.
  Until then, a waiting entry is found by its `retrievalUri`. Resolving it
  gets its dialect with `JsonSchemaSession.getDialect`, which can find the
  meta-schema anywhere.
- A session sees a dialect defined by an entry exactly when it sees the
  entry, because the dialect comes from the entry's resolved document. A
  registry without the entry doesn't have the dialect.
- Full resolution is lazy, the first time a session asks for the entry.
  Problems are thrown as fatal messages then, as they are for a retrieved
  schema.

### Making sessions cheap

Creating a session costs nothing for a registry that's been used before,
and a registry that's one edit away from another is cheap to index.

- An entry never changes, and `with` and `without` carry the same entry
  objects into the new registry. Everything derived from an entry is cached
  once per `JsonSchema` (a `WeakMap` keyed by the entry) and shared by every
  registry and session: its identification and, lazily, its resolved
  document. An identification that used a dialect from another entry isn't
  cached, because it depends on the registry. A resolved document is only
  shared if every resource in it uses a dialect added to the `JsonSchema`.
  One that used a dialect only its session had belongs to that session.
- A `JsonSchema` builds an index (URI to entry) for each registry the first
  time a session uses it, and keeps it in a `WeakMap` keyed by the registry.
  Sessions point at the indexes. A new registry from `with` or `without`
  gets a new index, which only identifies the new entry. The rest is
  copying cached identifications into a `Map`.
- An old registry, its index, and the sessions that use it are garbage
  collected when nothing refers to them. Nothing keeps track of open
  sessions.
- What a session still builds itself is its document cache and embedded
  index for what it actually uses, plus anything that depends on a dialect
  only that session has.
- A cached identification or resolved document reflects the definitions
  when it was made. A later `addKeyword` or `extendDialect` doesn't change
  it, as with any schema that's already been resolved.

### Meta-schemas

- The presets don't include the official meta-schemas. They aren't needed
  to identify, resolve, or validate schemas, because each preset adds its
  dialect and schemas are validated keyword by keyword. Compiling a
  meta-schema, or a schema that references one, retrieves it like any other
  schema.

### What can be retrieved (`allowRetrieval`)

Schemas aren't trusted. A schema shouldn't be able to make an application
retrieve whatever it names, such as an internal address over HTTP or a file
outside the project through a `file:` reference. So only what the
application allows is retrieved, and the default allows only what's local
to it.

It's browser's (`HyperjumpConfig.allowRetrieval`), because it's about
retrieval and browser does the retrieving, and JRef documents aren't
trusted either. `JsonSchemaConfig` gets it from `HyperjumpConfig`, and
`RetrievalNotAllowedError` is browser's, re-exported. It was in this package
first, where it had to copy browser's context URI, run its own `realpath`
next to the file plugin's, pass what a session allows to `retrieve`
disguised as a `GetOptions` field, and unwrap the error from browser's
`RetrievalError`.

- The `allowRetrieval` config is a list of URLs, `string[]`. One that ends
  with `/` allows everything under it. Any other allows only itself. They're
  compared after the URL is parsed, so dot segments and the host can't get
  around it. An entry's fragment is ignored.
- A relative entry is resolved against browser's context URI, like a
  relative path is. That's the working directory in Node.js and the page in
  a browser. Entries are resolved when the config or the session's options
  are given, and one that isn't a URL throws there. A relative entry where
  there's no context URI, such as in a worker, throws and says to use an
  absolute URL, instead of quietly allowing nothing. The default is resolved
  when a session first checks a URL, so an application without a context
  URI that only uses registries doesn't need the config.
- The context URI is browser's `#context-uri`. Without a page, it's `""`,
  which counts as none.
- browser's default is `["./"]` too. It's a hypermedia client, and
  following links across origins is what it's for, so an application that
  browses a remote API lists its origins. Allowing everything in browser,
  with `JsonSchema` passing its own default, was considered, but the threat
  is the same, and browser's users would only be safe if they opted in.
- The default is `["./"]` everywhere: the working directory in Node.js, and
  the page's directory in a browser. Browsers can't read `file:` URLs
  anyway.
  - It's data, so an application extends it by writing it out, such as
    `["./", "https://schemas.example.com/"]`, and `[]` allows nothing.
    It's the same in Node.js and in browsers.
  - It used to be a predicate, `(url: URL) => boolean | Promise<boolean>`,
    with a default for each runtime: files in the working directory's real
    path in Node.js, and the page's origin in a browser. Allowing a URL as
    well as the default meant calling the default, so it would have had to
    be exported, and a predicate written without it had to know to compare
    against `realpath(cwd())`, not `cwd()`, or a working directory reached
    through a symlink refused every file. The CLI had its own prefix
    matching for its setting too. A list has none of these problems.
  - In a browser, the default used to be the page's whole origin. It's the
    page's directory now, which is narrower. An application whose schemas
    are elsewhere on its origin adds `"/"`. A default of `["/"]` in
    browsers would have kept the origin, but then the default would be
    different in Node.js, where `/` is the whole filesystem.
- A `file:` entry is compared by its real path, like the URL being checked
  (see the symlink item below). It's found the first time a session checks
  against it and kept for the session, which is a consistent snapshot
  anyway. An entry that doesn't exist is compared as it is.
- A file that doesn't exist has no real path, so its path is checked as
  it is. If it's allowed, retrieving it fails as missing instead of being
  refused.
- Only prefixes and exact URLs, no globs. Prefixes cover origins,
  directories, and single URLs. Glob syntax would collide with URLs, where
  `?`, `*`, `[`, and `:` already mean something, so every entry would be a
  pattern and a literal one would need escaping, and a glob matched against
  the whole URL text lets `https://*.example.com/` match
  `https://evil.com/x.example.com/`. If wildcards are needed, such as any
  subdomain, entries could also be `URLPattern`s (`(string | URLPattern)[]`).
  It's the web standard, matches each part of a URL separately, and takes a
  base URL for relative patterns. Strings would stay literal. Check which
  Node.js versions have it unflagged first.
- A predicate as well as the list, for anything a list can't say, was
  considered and left out until someone needs it. Whoever used it would
  have the problem the list solves.
- browser's `Session` checks it when it retrieves a document that isn't in
  its cache, before it calls `Hyperjump.retrieve`. That's after embedded
  resources and registries, because `JsonSchemaSession.getDocument` finds
  those first. So it covers `get`, following references, `compile`, and
  meta-schemas found by `getDialect`. It's before the URI scheme plugins, so
  it's before the HTTP cache too, and a cached response isn't a way around
  it. `Hyperjump.retrieve` itself isn't checked. It's for URI scheme plugins
  that map to another URI, like `urn:`, and the response they give is
  checked by its URL.
- browser throws a `RetrievalNotAllowedError` as it is, not wrapped in a
  `RetrievalError`, so it's what `get` and `compile` throw. A refusal while
  getting a dialect's meta-schema is the `cause` of `getDialect`'s error.
- A URL `allowRetrieval` refuses is a `RetrievalNotAllowedError`, distinct from
  a `RetrievalError` for a URL that was allowed and couldn't be retrieved.
  Tools use the difference: a refused URL is unknown, a failed one is
  missing.
- It's config, because it's a property of the application, like its URI
  scheme plugins, and every session should follow it by default. A session
  can have its own (`SessionOptions.allowRetrieval`), which replaces the
  config's rather than adding to it, for an application that allows
  different things for different sessions, like the CLI does for files with
  different settings. A session can allow less than the config, so it
  can't only add to it. One that allows more lists the config's entries
  too. The application creates its sessions, so it's still the
  application's decision. `JsonSchemaSession` passes its option to
  browser's `Session` constructor.
- Symlinks are handled by the library. A symlink inside an allowed
  directory can point outside it. In Node.js, a `file:` URL is replaced
  with its real path (`realpath`) before it's checked, and so are `file:`
  entries. browser's file plugin reads the file from its real path, with
  every symlink in the path resolved, and gives that real path as the
  response's URL, which is checked again (see the next item). So what's
  checked is what's read, even if the path changes between the first check
  and the read. There's no cheaper way to tell whether a path goes through
  a symlink than `realpath`, so every `file:` retrieval costs two
  filesystem calls, the check's and the plugin's.
- A document read through a symlink is identified by its real path, so its
  relative references resolve from where the file really is, next to the
  files its author wrote it with. That's browser's choice, and it's how
  Node.js resolves modules. Keeping the URL it was asked for was
  considered, but the author of a symlinked file didn't write it relative
  to the link.
- Redirects are checked after the fact. The URL a response came from is
  also checked, after any redirects, and a response from a
  refused URL is a `RetrievalNotAllowedError` whose `uri` is that URL. Its
  body is cancelled. browser's file plugin also gives a symlinked file's
  real path as its response URL, which is checked the same way. browser doesn't follow
  redirects manually, so the redirected request is still sent. Only its
  response can't be used, which is what CORS does in browsers (see "Known
  limitations").
- `[]` allows nothing, so only registries and embedded resources are used.
  The test suite runners and the tests that only use registries use it
  instead of removing the `http(s):` URI scheme plugins. Tests that read
  files from a temporary directory, outside the working directory, allow
  that directory.

### The language server

- Its `allowRetrieval` is the workspace folder. The library compares real
  paths, so a symlink can't lead outside it.
- Workspace schemas with an `$id` go in a registry with their `file:` URI
  as the `retrievalUri`. An edit makes a new registry (`without` then
  `with`), which the next session is created with.
- Schemas without an `$id` are retrieved from their `file:` URIs. Files
  aren't HTTP cached, so a new session sees the edits.
- A new session for each change to the workspace sees a consistent snapshot,
  and the old one is dropped. Validators compiled in an old session have to
  be compiled again. The URIs a validator was compiled from (its IR's keys)
  could be exposed for that.

## Validation API (`src/json-schema.d.ts`)

Implemented in `src/kernel/validator.js`.

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
- Problems that are returned are plain data, and problems that are thrown
  are `Error`s. Validation errors and syntax errors are returned, so
  they're plain objects with `source`, `ruleId`, and `place` (validation
  errors also have absolute keyword location and instance location), and
  no message. Text input adds positions. Any syntax
  error makes the instance invalid, but it's still validated as far as it
  could be parsed. Schema problems are thrown, so they're `VFileMessage`s.
- Errors are converted to `VFileMessage`s where they're reported, with
  `toVFileMessage`, which gives them a generic message. A validation error
  says it fails the constraint at its absolute keyword location, which
  identifies the keyword wherever evaluation started. It names the
  instance location only when there's no position, because a position
  says where the instance is better. Reporting errors with unified needs
  this conversion anyway: `file.message` makes a message that belongs to
  the file, so a `VFileMessage` made elsewhere would have to be made again.
- Validation errors were `VFileMessage`s with generic messages at first.
  Creating an `Error` costs about 0.25µs even without capturing a stack
  trace, and the messages took time to build. Plain objects without
  messages made BASIC about 40% faster and DETAILED about 55% faster on the
  test suite's invalid instances.
- `annotate` returns `{ output, status, node }`. Annotations are
  `node.data.annotations`, a `Map` of annotation keyword URI to values.
- Annotations are read with `annotation(node, keyword, dialectUri)` on
  `JsonSchemaSession`, like the other AST operations, as in v1. The keyword
  is a keyword URI if a keyword with that URI has been added (without the
  fragment, for unknown keywords), so a URI doesn't need the dialect.
  Otherwise it's a name in the dialect (v1 by default), and a name that
  isn't in the dialect is an unknown keyword. The dialect is looked up
  synchronously, so one built from a meta-schema has to have been built in
  that session. There's no `annotatedWith` like v1's. The AST is a unist
  tree, so unist utilities can find annotated nodes. Annotations don't
  record the schema location they came from. The new output format spec's
  flat list of annotations would.
- In a broken (error-tolerant) tree, keywords skip `json-missing` and
  `json-invalid` nodes, and `required` counts a property with a missing value
  as present, so the syntax error is the only error for it.
- Extra information for the language server (schema locations, evaluated
  branches, annotations from failing schemas) comes from evaluation
  plugins.

## Compile and evaluate (`src/keyword.d.ts`)

This section and the ones after it, up to "Bundling", describe compiling
and evaluating before the kernel replaced them (stage 2 of "Moving the
kernel into `src/`"). What replaced them is in [KERNEL.md](KERNEL.md).
They're rewritten in stage 6.

Implemented in `src/evaluate/compile.js` (the IR) and
`src/evaluate/specialize.js`, with the instance operations in
`src/evaluate/instance.js`. Requirements: fast on plain JS values, exact
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
   it's needed and cached on the `Validator`. No `eval`. Bytecode run by
   one interpreter loop was tried instead of closures and wasn't faster
   (see [BENCHMARKS.md](BENCHMARKS.md)).

Between the two, the IR is optimized (see "Optimizations"). It's JSON, so a
compiled schema can be serialized (`Validator.serialize`,
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
  `evaluate` returns `undefined` if the keyword passes every instance in
  that specialization, like an annotation when annotations aren't
  collected, `format` without a validator, or `uniqueItems: false`. The
  keyword is left out, unless there are plugins, which see it pass. This
  saved 3–15% on real schemas.
  `context.alwaysPasses(handle)` says whether a subschema passes every
  instance and has no other effect (`true`, `{}`, or only keywords that
  were left out), so applicators can leave it out too, and return
  `undefined` if nothing is left. It's always false when annotations are
  collected, there are plugins, or the specialization tracks `evaluated`,
  and for a schema that refers to itself and isn't built yet.
- Keywords are written once for every instance representation. They look at
  instances through `context.instance` (`InstanceOps`: `typeOf`, `value`,
  `length`, `has`, `get`, `entries`, `keys`, `items`), which is fixed for a
  specialization. `keys` gives property names as instances (name nodes in an
  AST) for `propertyNames`, so their annotations go on the names. `typeOf` is
  undefined for `json-missing` and `json-invalid` nodes, and `has` is true for
  a property whose value is missing. That's how keywords get the
  error-tolerance rules without extra code.
- Applicators evaluate subschemas through `context.schema(handle)(instance,
  segment)`. The core tracks instance location and which AST node to
  annotate, so keywords never build pointers. In flag mode, the segment is
  ignored. `if` can evaluate `then` and `else` itself, so the `if`
  subschema is only evaluated once, and their errors still have their own
  absolute keyword locations.
- There's no keyword location that follows references (the output spec's
  `keywordLocation`), only the absolute keyword location. It cost every
  evaluation with plugins a string for every keyword, and a step from each
  keyword to its subschemas recorded in the IR, for something that's rarely
  useful. A plugin that wants it can build it from `beforeSchema` and
  `afterSchema`.
- Evaluation state (frames, locations, dynamic scope, plugins) lives in the
  specialization's closure instead of being passed through every call. An
  evaluation started from inside another one, such as by a plugin, saves the
  outer one's state and restores it. The fastest specialization doesn't use
  any state, so it doesn't save anything.
- `context.annotate` is only defined when annotations are being collected
  or there are plugins. Annotations are buffered in frames (see "Evaluation
  state"). Plugins get each one when it's made.
- Unknown keywords: the core looks up the definition by `keywordUri` without
  its fragment and passes the property name as `context.keywordName`. The
  unknown keyword's `compile` uses `context.dialect.unknownKeywords` to decide
  whether it's an annotation.

`validateJson` and `annotateJson` parse with browser's error-tolerant
`fromJson` and then evaluate the AST. Validating while parsing is a possible
optimization later. The two-phase design doesn't rule it out.

Sharing one keyword implementation between representations makes call
sites polymorphic, because V8 shares type feedback between closures created
from the same code. `validate` is about 15% slower in a process that has
also evaluated ASTs, and closures written for plain values are 1.06–1.23
times faster than the specialization on real schemas (see
[BENCHMARKS.md](BENCHMARKS.md)). What's left is mostly iterating an
object's properties and the polymorphism. Keywords could provide a separate evaluator for plain values
for those. That would be an addition to the interface, not a redesign. It's
undecided until after the optimization passes.

Annotations follow the spec: they're kept only if the keyword and every
schema they were evaluated through pass. An invalid instance gets no
annotations from the failing parts of the schema. The language server has its
own annotation implementation for that reason. Plugins see every
annotation, including the ones that aren't kept (see "Plugins").

### Optimizations (`src/evaluate/optimizations/`)

Each optimization pass is a file in `src/evaluate/optimizations/`, so what
the optimizer can do and where each pass is implemented can be seen from the
file structure, like keywords and dialects. `optimizations/index.js` lists
them, and `src/evaluate/optimize.js` runs them.

- A pass is an `Optimization`: `{ fastOnly, optimize }`. `optimize` takes
  the IR and the `JsonSchema`, to look up keyword definitions, and returns
  a new IR. It doesn't change the one it's given, because the `Validator`
  keeps it for its other specializations and for `serialize`. A pass that
  doesn't change anything returns the one it's given.
- Passes run in the order `index.js` lists them, because one can leave work
  for another, like folding a constant leaving a subschema nothing
  references. Unlike keywords, they aren't independent.
- A pass that keeps error locations runs once, when a schema is compiled,
  so a serialized IR already has it. A pass that loses them is `fastOnly`.
  It runs on that IR when the `Validator` builds a fast specialization (no
  plugins, no annotations), which only says whether an instance is valid.
  Errors come from an instrumented evaluation, which doesn't use it.
- A pass that depends on what a keyword means, like folding `not: true`,
  has rules for that keyword's URI. The knowledge stays in the pass, and a
  keyword it doesn't know about is left alone. If user keywords ever need
  to take part, keywords could provide the rules instead.
- Passes aren't part of the API. There's no `addOptimization`.
- A pass over a large IR isn't free. Copying or iterating the 4,304
  schemas of SchemaStore's `package.json` schema takes 0.5–1.6 ms, so a
  pass returns the IR it's given when there's nothing to do, and a pass has
  to save more than it costs (see "Optimizations" in
  [BENCHMARKS.md](BENCHMARKS.md)).

The passes:

- `static-unevaluated.js` (`fastOnly`): `unevaluatedProperties` becomes
  `additionalProperties` with the properties and patterns its siblings
  evaluate, and `unevaluatedItems` becomes `items` (2019-09's
  `additionalItems`) starting after its siblings' prefix, when what they
  evaluate is known without the instance. One whose siblings evaluate
  everything is left out. When no keyword reads `evaluated` anymore, the
  specialization doesn't track it. What's evaluated is known when the
  schemas applied to the same instance only use keywords the pass has
  rules for, conditional applicators (`anyOf`, `if`, …) don't mark
  anything in any subschema, and there's no `contains` or dynamic
  reference. Keywords that aren't applicators don't need rules: only
  applicators mark (`markEvaluated`), and a keyword can only apply the
  schemas whose handles are in its compiled value, or, if it reads
  `dynamicScope`, the ones dynamic anchors identify. Applicators need rules
  because nothing in a keyword definition says what it marks. It only needs the marks of a passing schema, because a
  schema whose sibling fails fails anyway, which isn't true with plugins
  or annotations.

Passes that were tried and aren't used:

- Inlining the schemas `$ref` and `allOf` apply (their keywords in place of
  the keyword) saved about 3% on `package.json` as 2020-12, where `$ref`
  is a keyword, and nothing on the test suite. Before 2019-09, `$ref` is
  already followed when compiling. It made the first `validate` about
  twice as slow (7 to 13–15 ms), half in the pass and half in building
  the 34% more keywords it copies, so it would take about 65,000
  validations to make that back.

Some optimizations aren't passes, because they're about how specialization
works rather than what the IR says, so they stay in `specialize.js`:

- Keywords whose `evaluate` returns `undefined` and subschemas that always
  pass are left out (see "Compile and evaluate"). Whether a keyword always
  passes is only known by building its evaluator.
- Evaluation state is only tracked if a keyword in the compiled schema
  `reads` it (see "Evaluation state").
- Evaluation state is kept in the specialization's closure instead of being
  passed through every call.

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

### Plugins (`src/evaluate/evaluation-plugin.d.ts`)

Plugins only observe evaluation. Nothing built in needs to change it. They're
passed per call (`ValidationOptions.plugins`) and are usually stateful
objects the caller reads results from afterwards.

- Hooks are `beforeSchema`, `afterSchema`, `beforeKeyword`,
  `afterKeyword`, and `annotation`. State is passed explicitly instead of through v1's shared
  context object: each `before` hook returns the plugin's state for that
  evaluation, which the core gives to the matching `after` hook and to what's
  evaluated inside it (a schema's state to its keywords, a keyword's state to
  the subschemas it applies). The core keeps the stack. That's enough to
  build nested results like DETAILED without touching shared objects.
- `annotation` is called when a keyword annotates, with the keyword's
  state, before `afterKeyword`. It's called for every annotation, even ones
  that aren't kept because the keyword or a schema it was evaluated through
  fails, because the language server needs annotations for invalid
  documents. A plugin that wants the spec's rule can apply it, because
  `afterKeyword` and `afterSchema` say what passed. Only keywords that
  annotate with a value they already have (`title`, `format`, …) annotate,
  so it costs a call for each one.
- Hooks get a `SchemaInfo` or `KeywordInfo`, created once per specialization
  so passing it doesn't allocate, with its absolute keyword location. They
  also get an `EvaluationLocation` with the instance location, the AST node
  when there is one, and a lazy `value()`.
- With any plugin, the instance is evaluated once with `exhaustive` on. A
  plugin never sees an instance twice (coverage counts) and always sees every
  keyword that applies. That makes plugins slower, which is the trade-off.
- Validators are specialized on whether there are plugins, not on which
  ones. Plugins are often created fresh for each call, so a cache keyed by
  plugin set would miss every time. That makes at most four specializations
  per representation: fast, instrumented, annotate, and annotate with
  plugins (annotate is AST only).
- Plugins are an important path (the language server evaluates with them),
  so what the core does for them is kept small:
  - Several plugins are combined into one plugin whose states are arrays.
    The specialization calls one plugin's hooks with plain states, so the
    usual case of one plugin doesn't loop or allocate arrays.
  - An `EvaluationLocation` is only about where in the instance, so every
    schema and keyword evaluated on the same instance (through `allOf`,
    `$ref`, …) shares one. It's created when evaluation moves to a property
    or item, not for every hook call, and it doesn't change, so a plugin
    can keep it.
  - It's an instance of one class shared by every specialization, with
    `value()` as a method, so it's one allocation and hooks always see the
    same shape.
  - An array index is appended to the instance location without escaping.
  - An AST's instance locations are built the same way as a JS value's,
    even though each node has its location from parsing. Taking it from
    the node (the part after the root node's location, percent-decoded)
    wasn't faster with plugins that don't read it, and was up to 10%
    slower with ones that do.
  - Plugins need to be easy to write, so expensive parts aren't made lazy
    in ways plugins have to know about. A shared location that's only valid
    during the hook, with pointers built when they're read, was about as
    fast for most plugins but made them harder to write, and didn't help
    BASIC, which reads locations for every failing keyword. Recording a
    trace of integers instead of calling hooks was slower than calling
    them.

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
- The built-in formats' errors don't have messages. Explaining errors is
  left to other output formats, such as `json-schema-errors`, so messages
  aren't part of the keyword interface.
- BASIC and DETAILED collect errors in one list for the whole evaluation.
  A schema's or keyword's plugin state is where its errors start in the
  list, so nothing is allocated until something fails. A passing schema or
  keyword cuts the list back to where it started, which drops what its
  subschemas added. A failing keyword's error goes before its subschemas'
  errors (BASIC) or takes them as its `errors` (DETAILED). Only `if` and
  `conditional` have a state object, with their conditions. The list is
  only cut when it's longer, because setting an array's length is slow even
  when it doesn't change. That made BASIC's plugin cost about the same as
  hooks that do nothing.
- Errors are created when a keyword fails, even though most are dropped
  when the branch they're in passes (failed `anyOf` alternatives, `if`
  conditions). Creating only the ones that are kept was considered, but
  an error is a small object now that locations are cheap to read, and not
  creating error objects at all was only 0–3% faster.
- Output formats can share utility functions, but not a base class. Each
  format's plugin has all of its own hooks, so it reads on its own and can
  change without affecting the others.

## Bundling (`src/bundle/`)

`bundle(uri, options)` on `JsonSchema` and `JsonSchemaSession` makes a compound schema document the way
2020-12 describes, in any dialect: every referenced document is embedded in
the main schema's definitions with its identifier, so no reference changes.
It's v1's bundler and keeps its options (`alwaysIncludeDialect`,
`definitionNamingStrategy`, `externalSchemas`). A new kind of bundle is
being considered (see "Open questions").

- Like `compile`, `JsonSchema.bundle` creates a session for it, and its
  options include `SessionOptions`, so the session's registries and
  `allowRetrieval` decide what can be bundled. It's implemented in
  `src/bundle/bundle.js`, which isn't exported.
- References are found the way `visitReferences` finds them (`$ref` and
  draft-04–07 reference nodes), plus 2020-12's `$dynamicRef`, in the whole
  tree, so a reference in a definition nothing uses is bundled.
  `$recursiveRef` and v1's `$dynamicRef` never leave the document. A custom
  keyword that references a schema isn't followed. Compiling and bundling
  what the session loaded was considered, because it would follow any
  keyword, but it misses definitions nothing uses, which a library of
  definitions is.
- A reference to a resource that's already in the bundle, including one
  embedded in an embedded document, isn't followed. Each document is
  embedded once.
- A document is found with `getDocument` and no `referencedFrom`, so it's
  always a whole document from a registry or retrieval. If its URI isn't
  the one the reference used, the reference wouldn't find it in the bundle,
  so that's an error rather than a broken bundle.
- The schema AST stringifies back to the original document, so a document
  is embedded with `jsonValue` and nothing has to be put back, unlike v1,
  which restored anchors. The root gets `$schema` and an identifier, first.
  An identifier that's already there is replaced, because a relative one
  would be resolved against the bundle. A plain-name fragment in a draft-04
  `id` is kept, because it's an anchor.
- `$schema` is always on the main schema, and on an embedded schema whose
  dialect is different (or always, with `alwaysIncludeDialect`). The
  resolver reads `$schema` before anything else, so an embedded schema in
  another dialect is identified by its own dialect's `$id`. One that already
  has `$schema` keeps it. draft-04–07 dialects are written with an empty
  fragment, as their meta-schemas are.
- A main schema from a file isn't given an identifier, and embedded files
  are identified relative to it, so the bundle can be moved with its files.
  Anything else is identified by its absolute URI.
- `false` is embedded as `{ "not": {} }`, because only an object can have
  an identifier. `true` is `{}`.
- In draft-04–07, a `$ref` at the root replaces the whole object. An
  embedded document with one would lose its identifier, and a main schema
  with one would lose its definitions, so both are errors. A main schema
  that's only a `$ref` with nothing to embed is returned as it is, because
  its dialect isn't recorded.
- Meta-schemas aren't bundled. `$schema` isn't a reference, and
  `getDialect` doesn't look in embedded resources.
- Tests run v1's bundle test cases in every dialect, with both naming
  strategies: the bundle is compiled on its own and must give the same
  DETAILED errors and annotations as the schemas it was made from.

## Built-in keywords

- The v1 dialect (`src/dialects/v1`) includes the `propertyDependencies`
  proposal. `conditional`, `itemPattern`, and `requireAllExcept` are added
  with `extendDialect`, as a reminder that they aren't full proposals yet.
- Equality (`const`, `enum`, `uniqueItems`) compares through `InstanceOps`,
  so an AST isn't copied. A value that couldn't be parsed counts as equal
  for `const` and `enum` and as different for `uniqueItems`, so it never
  causes an error of its own.
- Keywords that depend on a sibling (`additionalProperties`, `items`,
  `contains`, and `if`) read it from the schema AST when they're compiled.
  `then`, `else`, `minContains`, and `maxContains` have no effect on their
  own.
- Compiled maps of schemas are `[name, handle]` pairs because a name like
  `__proto__` can't be a property of a plain object.
- The meta-data and content keywords are annotations. `contentEncoding`,
  `contentMediaType`, and `contentSchema` only annotate strings, and
  `contentSchema` only annotates if there's a `contentMediaType`. Content
  isn't decoded or validated.
- In v1, `$dynamicRef` is the name of a dynamic anchor, not a URI. It uses
  the outermost schema in the dynamic scope with that anchor, with no
  lexical fallback. If none is in scope, evaluation throws, because that's
  a problem with the schema, not the instance.

## Presets

A `JsonSchema` starts with no dialects, only `$schema` and the unknown
keyword, which every dialect has. Presets are independent, and any of them
can be added to one `JsonSchema`.

- A preset adds its dialect, then each keyword and format its dialect uses
  that hasn't been added yet (`addPreset` in
  `src/dialects/add-preset.js`). So a keyword someone replaced stays
  replaced, whatever order presets are added in, and adding a preset twice
  throws before it changes anything.
- Each preset imports and lists every keyword and format definition its
  dialect uses, and defines its own format names, even though most are the
  same in every preset. A preset is read on its own, and a shared list
  would hide what each one uses. `addPreset` throws if the dialect names a
  keyword that isn't in the list.
- v1 used to be in every `JsonSchema`, because keyword schemas were written
  in v1. Now it's a preset like the others (`addV1`).
- Formats that need Unicode data aren't added by any preset. A dialect can
  still name them, and they're only supported once the full formats are
  added.

- **2020-12** (`src/dialects/draft-2020-12`, `addDraft202012`) adds 2020-12's
  `$dynamicRef` and `type`, its vocabularies with `addVocabulary`, and its
  dialect. Its `type` can be an empty array, which the drafts allow and v1
  doesn't. draft-04 through 2019-09 use it too. `$dynamicRef` resolves
  like `$ref`, and if the schema it resolves to has a dynamic anchor named
  by the fragment, the outermost schema in the dynamic scope with that
  anchor applies instead.
- **2019-09** (`src/dialects/draft-2019-09`, `addDraft201909`) is built the
  same way. It adds `$recursiveAnchor`, `$recursiveRef`, and its own
  `$anchor`, whose names can contain `:` but can't start with `_`. It also
  adds its `items`, which is a schema or an array of schemas, and
  `additionalItems`, which only has an effect after an array of schemas.
  draft-04 through draft-07 use them too.
  They reuse the `items` and `prefixItems` evaluators. `$recursiveRef`
  resolves like `$ref`, and if the schema it resolves to has
  `$recursiveAnchor: true` (the dynamic anchor `""`), the outermost schema
  in the dynamic scope with it applies instead.
- **draft-04, draft-06, and draft-07** (`src/dialects/draft-04`,
  `src/dialects/draft-06`, `src/dialects/draft-07`, `addDraft04`,
  `addDraft06`, `addDraft07`) don't have
  `$vocabulary`, so each adds a dialect. Their dialect URIs don't have the
  empty fragment their
  `$schema` usually has, because `$schema` is resolved to an absolute URI.
  Unknown keywords are ignored. `$ref` is draft-07's, which makes the schema
  a reference, and `id`/`$id` is draft-07's, which can also be an anchor.
  All three add 2019-09's `items` and `additionalItems`, and a
  `dependencies`, which is `dependentRequired` and `dependentSchemas` in
  one keyword. draft-06 shares draft-07's. draft-04 has its own
  `dependencies`, `enum`, and `required`, because it says they can't be
  empty and `enum` can't have duplicates. Later drafts allow them to be
  empty and only say `enum` shouldn't be or have duplicates, which is lint
  (see "Validity and lint"). draft-04 adds `maximum` and `minimum`, which
  read the sibling boolean `exclusiveMaximum` and `exclusiveMinimum`,
  which require them. `format` validates by default, as most
  implementations of these drafts did. Their `format` is
  draft-07's, which makes a format the dialect doesn't have only an
  annotation, as the drafts say. Each dialect only has the formats its
  draft defines, so the draft-04 and draft-06 meta-schemas' `regex` is
  ignored. draft-04 and draft-06 use draft-06's `hostname` (RFC 1123),
  which doesn't need Unicode data.

## CLI

The `hyperjump` CLI is its own package and repository,
[`hjlint`](https://github.com/hyperjump-io/hjlint) (`../hjlint`), with its
own DESIGN.md. It was here first, as `src/cli/` and then as an npm
workspace. It's separate so the libraries don't depend on `unified-args`
and the engine, and it uses only this package's public API.

- The lint rule tests used the CLI's processor. They use
  `src/lint/test-linter.js`, which parses and resolves the way the CLI
  does, without the engine.

## Validating JSON files (`src/validate/`)

`jsonSchemaValidate({ validator })` is a unified plugin that validates a
JSON AST from `rejsonParse` against a compiled schema. It's how the CLI
validates instances, and how other unified tools can.

- It takes a `Validator`, not a schema URI. Compiling is the caller's
  business: which session, registries, and `allowRetrieval`, and whether a
  validator is shared between files.
- It uses `validateNode` with BASIC output and adds each error with
  `file.message`, described by `outputErrorMessage`, as an error
  (`fatal: true`). The rule ID is the keyword URI and the source is
  `json-schema`, as in the output. The tree isn't changed.
- Syntax errors are the parser's to report. Values that couldn't be parsed
  aren't evaluated, so they don't add errors of their own.

## Linting

The reason for building on unified is its linting ecosystem: rules that are
plugins, configured per project, with presets, like remark-lint.

### Validity and lint

| | Validity | Lint |
| --- | --- | --- |
| Question | Can the schema be used? | Is the schema likely wrong, or badly written? |
| Where | `shape`, `check`, and `resolve` hooks, while resolving | unified plugins that run after resolving, on the schema AST |
| Configurable | No. The dialect and keywords define it | On or off, `warn` or `error`, and options |
| Default | Always on, always errors | Off, unless a preset turns it on |

- What a spec says a keyword's value MUST be is validity, and what it says
  it SHOULD be is lint. The spec's text decides, not its meta-schema, as
  v1 says. The draft meta-schemas don't allow an empty `type` array, or an
  empty `enum` in draft-06 and draft-07, but the drafts' text does, so
  they're lint. Draft-04's `exclusiveMaximum` MUST have a `maximum`, so
  it's an error, and an empty `enum` is an error in draft-04 (MUST) and
  lint after it (SHOULD).
- A keyword with no effect (`then` without `if`, `minContains` without
  `contains`), a reference to something missing, and an unknown `format`
  that's only an annotation are lint. The schema still works.
- An unsupported `format` when formats are validated is validity, because
  the schema can't be compiled. It's a compile error today and moves to the
  `format` keyword's `check`.
- A MUST the implementation recovers from is lint, at `error` in
  `recommended`, rather than validity. Being tolerant of bad input is
  better than refusing a schema that can be understood. A v1 `$schema`
  with a fragment, or that isn't normalized, still finds v1, so it's
  `invalid-dialect-uri`.
- `check` stays for validity only. Its context has the schema the keyword
  is in, for requirements on siblings, like draft-04's `exclusiveMaximum`
  needing `maximum`, but not other schemas or warnings. Rules read the
  resolved AST instead. Every keyword in a schema is identified before any
  is checked, so a check finds siblings that come after it.

### Rules

- Rules and presets are in this package, in `src/lint/`.
- A rule is made with `lintRule` from `src/lint/`, which wraps
  `unified-lint-rule`'s (see "Configuration comments"), so its config is a severity
  (`"off"`, `"warn"`, `"error"`, or 0–2) and its own options. Its origin is
  `jsonschema-lint:<name>`. The severity has to be in an array
  (`[rule, ["error"]]`, `[rule, [2, options]]`). A bare `"error"` is taken as
  the rule's options, at the default severity, which is a warning.
- Rules are exported as `lint/rules/<name>`, the preset as
  `lint/recommended`, and the utilities as `lint`, for rules in other
  packages.
- Presets bundle rules with their settings, like remark's
  `remark-preset-lint-recommended`. A project's `.hyperjumprc` uses a
  preset and adjusts rules. The CLI loads plugins with the `hyperjump`
  prefix.
- Rules find keywords by keyword URI, never by name, so a rule works in
  every dialect with the keyword and does nothing if the keyword isn't
  loaded. A rule about a draft-specific keyword uses that keyword's URI.
  A rule about something a draft's own keyword already reports, like
  draft-04's empty `enum`, leaves that keyword's URI out.
- Utilities in `src/lint/` keep rules short: visit every schema, visit every
  keyword by URI, get a sibling keyword, and find what a reference points
  to. They know nothing about particular keywords.

### The rule catalogue

Rules are being ported, one at a time, from the linter-agnostic catalogue
at https://github.com/Karan-Palan/json-schema-lint-rules (`rules/*.json`).
It's a list of candidates, not a spec.

- Catalogue rules that differ only by keyword are one rule here:
  `then_without_if` and `else_without_if` are `then-else-without-if`, and
  `min_contains_without_contains` and `max_contains_without_contains` are
  `min-max-contains-without-contains`. `unresolved_ref_pointer` is
  `reference-without-target`.
- One that's dialect-specific in the catalogue, like the `_draft` and
  `_modern` pairs, is one rule here if keyword URIs make it work everywhere.
- Rule IDs are kebab-case and say what's found (`if-without-then-else`),
  not what to do.
- Something a spec says a keyword's value MUST be is validity, so it isn't
  ported as a rule (see "Validity and lint"). Check what each draft says,
  because some changed: draft-04's `enum` MUST have values, and later
  drafts' SHOULD, so `empty-enum` is lint everywhere but draft-04.
  `duplicate_required_values` isn't, because `required`'s check
  (`uniqueStrings`) reports duplicates in every dialect, as their
  meta-schemas do.
- A rule that some users' tools disagree with is still ported and still in
  `recommended`, if it's usually right. That's what configuration is for.
  `type-implied-by-const-or-enum` reports a `type` that code generators
  may want, and those users turn it off. Opinionated rules that are
  matters of taste (`explicit_additional_properties`,
  `require_description_title`, `unknown_keywords_prefix`) aren't in
  `recommended`, if they're ported at all.
- A rule that compiles and runs a schema isn't in `recommended`, however
  likely its finding is a mistake, because of what it can cost on a large
  schema: `invalid-default-or-example`, `assertion-implied-by-const-or-enum`,
  and `const-or-enum-value-rejected`. Its `.d.ts` says so.
- A catalogue rule whose premise the spec contradicts isn't ported.
  `content_media_type_without_encoding` says `contentMediaType` means
  nothing without `contentEncoding`, but no encoding means the string
  isn't encoded, and the specs' own examples do that.
- Messages are rewritten, not copied. The catalogue's say what to do
  ("Add `then`, `else`, or remove `if`."). Ours say what's wrong, in the
  keyword's own name, and are accurate for every dialect the rule works in.
  `if` alone isn't "no effect" in 2019-09 and later, because its
  annotations count for `unevaluated*`, so its message is "'if' without
  'then' or 'else' only collects annotations".
- Each rule gets a `.d.ts` that explains why it matters, tests (including a
  dialect without the keyword and a property with the keyword's name), a
  row in the README's table, and a place in `recommended` if it's likely a
  mistake and cheap to run.

Rules of our own are added too, when porting turns up a mistake the
catalogue doesn't cover. Done so far: `empty-type`,
`const-or-enum-value-for-disallowed-type`, `required-property-not-allowed`,
`keyword-without-type`, `required` against `maxProperties` in
`contradictory-limits`, `const-or-enum-value-rejected`,
`required-dependent-property`, and `invalid-default-or-example` checking
values against the schemas that apply theirs.
`assertion-implied-by-const-or-enum` also covers the catalogue's
`enum_validation_keywords_default`. There are no candidates left.

### Configuration comments

- A `$comment` that starts with `jsonschema-lint-disable` turns rules off
  for the schema it's in, including its subschemas, and one that starts
  with `jsonschema-lint-enable` turns them back on. The rule IDs after it
  are the rules it covers, and without any, it covers every rule. A rule is
  named by its rule ID, without its source.
- Scopes nest. The innermost schema with a directive that covers a rule
  decides whether it's on, so a subschema can turn a rule back on, or off
  again, just for itself.
- It's found by the `$comment` keyword's URI, and by the unknown keyword's
  URI for `$comment` (`…/unknown#$comment`), so it works in dialects
  without `$comment` (draft-04, draft-06) too.
- A directive that names a rule the processor doesn't use is a warning
  (`unknown-rule`), and so is a `$comment` that starts with
  `jsonschema-lint-` but isn't a directive (`unknown-directive`). Both have
  the source `jsonschema-lint` and can't be turned off. A rule is used if
  it's made with `lintRule` and added to the processor, even if it's off.
- Rules are made with this package's `lintRule`, which wraps
  `unified-lint-rule`'s. When a rule's transformer finishes, it removes the
  messages the rule just added where a directive turns the rule off. The
  first rule to run on a file reports the directive warnings, before the
  rule itself runs, because `unified-lint-rule` gives every message added
  while a rule runs that rule's ID. Directives only affect lint rules, so
  schema problems can't be turned off.
- `unified-message-control` isn't used:
  - It filters the messages already on the file, so it has to run after
    every rule. The rules in `.hyperjumprc` are added after the CLI's
    processor's plugins, so it would run first and see nothing.
  - Its marks are points where rules turn off or on, in document order, not
    ranges that nest. A directive in a subschema would change the state for
    the rest of its parent, too.
  - What it has that this doesn't: `ignore` (the next node only), its
    `reset`, `enable`, and `disable` options for the initial state, which
    `.hyperjumprc` severities cover, and dropping messages in gaps in the
    tree, which a schema AST doesn't have. It controls any rule's messages
    by source, and this only controls rules made with `lintRule`.
- A rule made with `unified-lint-rule` directly ignores configuration
  comments, and naming it in a directive is an `unknown-rule` warning.
- Configuration comments from JSONC comments are deferred (see hjlint's
  "Plan"). They
  would cover from the comment on, as in remark, and need JSONC support,
  which browser's parser has (`allowComments`) and the CLI doesn't, because
  it also decides which files are schemas.

### Other schemas

Some rules need other schemas, like one that checks a reference to another
document finds something. They can see what's in registries and what
`allowRetrieval` allows, and nothing else.

- The resolve step puts the file's session on `file.data.jsonSchemaSession`.
  Rules use it and never create sessions, so they get the application's
  `allowRetrieval` instead of each rule having to remember a restriction.
- `findSchema(session, uri, options)` (`src/lint/find-schema.js`) finds what
  a reference would, without following a reference it finds. Its result is
  `found` with the node, or `missing` or `unknown` with the reason as an
  error, so a rule can say why.
- Only a definite absence is `missing`: a file that doesn't exist, an HTTP
  404 or 410, a document that isn't a schema, a fragment that doesn't point
  to anything, an anchor that doesn't exist, or something that isn't a
  schema. Anything else that keeps it from telling is `unknown`: a refused
  URL, an unsupported URI scheme (like `urn:`), any other retrieval
  failure, or a document with problems. A rule reports `missing` and not
  `unknown`. Otherwise every reference to a published schema would be
  reported, and so would every one to a schema that's already reported as
  having problems.
- A document that's linted isn't retrieved. The engine reads the file and
  the processor resolves it, so the session doesn't have it. A reference
  from it is found with `findSchema`'s `document` option, which looks in
  the referencing document's `embedded` map before the session, the way
  `getDocument` does with `referencedFrom`. Rules get the nodes being
  linted, even when the document has problems, and nothing is read again,
  so stdin and editor buffers work.
- Adding the linted document to the session was considered: to browser's
  cache, with a new method or a session option, or to a session registry.
  It would mean changing browser's cache from outside, a second session per
  file (resolving needs the session first), or resolving the file twice and
  getting another tree, which can't be resolved at all if it has problems.
- A reference back to the linted file from another document goes through
  the session, which retrieves the file. That's the same text for the CLI.
  The language server's `file:` plugin reads open files from their buffers.
- Rules follow references the way browser does: resolve the reference
  against its resource's URI and find that. `visitReferences` does the
  first part for every static reference, in every dialect: a `$ref`
  keyword (2019-09 and later), resolved against its schema's location, or
  a schema that's a reference (`$ref` in draft-04 through draft-07, whose
  `href` is already resolved). Following one is `findSchema` on its URI.
  Dynamic references aren't visited, because what they find depends on
  evaluation.
- `reference-without-target` reports a static reference whose target is
  `missing`, with `findSchema`'s reason. It covers references within the
  document as well as to other documents, because both are a schema that
  can't be compiled. It's an error in the recommended preset, where every
  other rule is a warning, because `compile` fails on the same reference.
  A target that isn't a schema is `missing` too, such as `#/definitions/foo`
  in 2020-12, where `definitions` isn't a keyword, which `compile` also
  can't find. A reference that's `unknown` isn't reported.
- Schemas aren't trusted, but plugins are. A plugin could make its own
  unrestricted `JsonSchema`. Nothing can stop code that sets out to do that.
  The restriction keeps a schema from making rules retrieve what it names.

### Linting while resolving (planned)

Linting needs a unified pipeline today, outside of hjlint. Users who
compile schemas should get lint results from the schemas they already
use, without building one.

- Lint is configured on the session: `SessionOptions.lint`, a list of
  plugins in the same shape as `.hyperjumprc`'s (`[recommended, [rule,
  ["warn"]]]`), or `true` for `lint/recommended`. It applies to
  every document the session resolves, for `compile`, `bundle`,
  `getDocument`, and browsing. `compile(uri, { lint })` works because
  `compile` already takes `SessionOptions`. Different parts of an
  application can have different rules, as with `allowRetrieval`, and
  there's no lint state on `JsonSchema`.
- Rules don't run in the media type plugin's `parse`. A resolved document
  from a registry is cached once per `JsonSchema` and shared by sessions
  (see "Making sessions cheap"), so it would keep the results of the
  first session's rules. Lint is a separate pass over a resolved document
  the first time a session uses it, and its results belong to the session.
- Results are plain objects until they're reported, like validation
  errors (see "Validation API"), and convert with `toVFileMessage`. A lint
  result has `source`, `ruleId`, `severity`, `place`, the document's URI,
  and its message, because a rule's message is specific and only the rule
  can write it. Rules still report with `file.message`, so results are
  converted from `VFileMessage`s when the pass finishes.
- A session collects results by document URI. A `Validator` has the
  results for every document its compile resolved. They aren't part of
  `serialize`, so a restored validator has none.
- A lint result at `error` makes `compile` fail, as an `error` fails a
  file in unified. `warn` results stay on the validator.
- Compiling doesn't stop at a schema's first problem. What's thrown is a
  `SchemaError` with every schema problem and every lint error, as plain
  objects. Today the media type plugin throws the first problem as a
  `VFileMessage`.
- `lint(uri)` on `JsonSchema` and `JsonSchemaSession` lints a schema and
  everything it references, the graph `bundle` walks, without compiling.
  It returns results by document URI and doesn't throw for schema
  problems, which are results too. It's for CI, editors, and schemas that
  can't be compiled yet. hjlint can use it for a schema and what it
  references.
- No callback for results (`onLint`). Collected results cover it.
- No rule sets for each dialect. A document can embed resources in other
  dialects, so a document's rules can't come from one dialect. Rules
  already do nothing where their keywords aren't loaded (see "Rules"), so
  `lint/recommended` works in every dialect.

## Testing

- The JSON-Schema-Test-Suite's `unify` branch (which will replace `main`)
  runs for every release: v1 (the suite's `9999`), 2020-12, 2019-09, and
  draft-04 through draft-07, each in its directory's
  `json-schema-test-suite.test.js`. v1 also runs the suite's proposal
  tests.
- One `JsonSchema` runs every test case of a release. Each test case's
  schema and `externalSchemas` are in a session registry, which keeps test
  cases from seeing each other's schemas, and `http(s):` is removed so
  nothing is retrieved. Each test is checked with `validate`,
  `validateJson`, BASIC, and `annotate`. Test cases tagged
  `format-assertion` run with `validateFormats`.
- The suite's annotation tests run in each directory's
  `annotation-test-suite.test.js` with `annotate` and `annotateJson`. Only
  annotation values are compared, in any order, because annotations don't
  record the schema they came from.
- The runners share `describeValidationTestSuite` and
  `describeAnnotationTestSuite` in `test/test-suite.js`. Each one gives the
  release, the dialect, the `JsonSchema` to use, and what to skip. The
  annotation runner gets the dialect itself, because the suite names
  keywords and annotations are identified by keyword URI.
- Tests for `conditional`, `itemPattern`, and `requireAllExcept` are in
  `src/dialects/v1/extension-tests`, ported from v1 except for
  `requireAllExcept`, which v1 didn't have tests for.

## Browser v2

What this relies on from browser's `v2` branch:

- A type parameter for property node annotations, JSON AST utilities that
  are generic over the node type, and a generic `DocumentNode<T>`.
- Embedding and anchors aren't in browser, because only JSON Schema uses
  them. Every document lookup, including following references, goes
  through `getDocument`, which a subclass can override. `getDocument` also
  gets the document a URI identifies, for what it has beyond its values,
  like a resource's dynamic anchors. A media type plugin's
  `fragmentPointer` defines what fragments identify, and each document
  records the media type of the plugin that parsed it.
- A file's media type uses the longest matching extension.
- `content-type` v3, with the parsed type validated.
- Methods are declared as methods, not function-valued properties, so a
  subclass can override them.
- Sessions, and an HTTP cache in the `http(s):` URI scheme plugin. A media
  type plugin's `parse` gets the session.
- `allowRetrieval`, in the config and in a session's options, and
  `RetrievalNotAllowedError` (see "What can be retrieved").
- `jsonValue` supports arrays and objects. `Session.value` doesn't, because
  it would need to follow references.
- `fromJson` returns syntax errors as plain objects in `errors`, and
  `jsonSyntaxErrorMessage` describes one. They become `VFileMessage`s
  where they're reported or thrown.
- Node locations are valid IRIs. Each pointer segment is percent-encoded
  with `appendToLocation` (`@hyperjump/uri`'s `encodeIriFragment`), which
  produces normalized IRIs, and `get` decodes a fragment before following
  it as a JSON Pointer. The resolver and compiler build locations the same
  way. Instance locations in output are JSON Pointers, so they aren't
  encoded.

## Open questions

- **Where keywords get their dependencies.** From a context argument
  (stateless, shareable keywords; current lean, and what `CompileContext`
  does) or constructor injection (matches browser's plugins).
- **`multipleOf` precision.** It uses v1's fixed tolerance for the
  remainder, which is wrong for very small divisors.
- **Annotations for invalid instances.** The spec drops annotations from
  failing schemas, which leaves the language server without them. Plugins
  see every annotation (the `annotation` hook), so the language server can
  have them. Whether `annotate` itself should offer another behavior is
  still open.

- **Documenting lint rules.** Users need to know what each rule reports,
  why it matters, its options, and which presets turn it on, so they can
  customize them effectively. remark-lint gives each rule a README with
  examples. A rule's `url` in its `lintRule` meta could link to its docs
  from every message. The README's table of rules won't scale.

- **Where the resolver could be more tolerant.** Recoverable input should
  be accepted and reported by the linter (see "Validity and lint"). Review
  the resolver for places it's stricter than it needs to be. For
  references: anything a reference targets could be accepted as a schema,
  even inside an unknown keyword, like `definitions` in 2020-12 or `$defs`
  in draft-07, and a lint rule would report a reference to a location that
  isn't a known schema. `reference-without-target` and
  `misnamed-definitions` report these as missing schemas today. Another
  case: in draft-04–07, `{ "$ref": "#/definitions/root", "definitions":
  {…} }` fails, because everything next to `$ref` is ignored, though tools
  like typescript-json-schema generate it and other validators accept it.

- **Portable bundles.** A bundle that's a folder of schemas (a tar?) rather
  than one compound document, so schemas can be moved between machines and
  implementations (a JS frontend and a C# backend) and restored in one step,
  straight into a registry. Paths would be the retrieval URIs. Unclear: how
  paths map to URIs, whether `$id`-less schemas need a base, and what other
  implementations would need to adopt it. v1-style bundling comes first.

## Plan

1. The kernel ([KERNEL.md](KERNEL.md)): keywords lower to a language of
   small operations the optimizer, lint, and the output formats understand,
   instead of compiling to opaque values and closures. It replaces the
   optimization candidates that needed keyword URIs (folding constants,
   sharing identical subschemas, ordering cheap keywords first) and the
   question of separate evaluators for plain values, which only the
   kernel's operations would need. The second prototype covers lowering
   from the schema AST, plugins and AST instances, optimizing with
   plugins, and lowering for lint (BENCHMARKS.md, "Kernel prototype from
   the schema AST"). Next: moving it into `src/` (see "Moving the kernel
   into `src/`").
2. Port lint rules from the catalogue (see "The rule catalogue"). Done so
   far: everything in `src/lint/rules/`.
3. Lint while resolving (see "Linting while resolving"): plain lint
   results, every schema problem in one `SchemaError`, lint on the
   session, then `lint(uri)`.
4. A style lint preset. It's opinionated about how a schema is organized,
   with rules for things like whether `$defs` comes first or last.
5. A bundle command in the CLI.
6. A documentation website.
7. Later: OpenAPI and migrating dependent projects.

### Moving the kernel into `src/`

In stages. Each one passes `npm test`, lint, and type-check, and is
reviewed before the next.

Some of it isn't in the prototype and has to be built, not moved:
collecting annotations (`annotate`, and the annotation test suites), the
`predicate` and `opaque` escape hatches, serializing (`kernel: 1`,
`restoreValidator`), and `static-unevaluated`, which the kernel still
needs, but as a pass without rules for keywords, because the operations
say what they mark. How long lowering and building closures take was
never timed.

0. **A reference.** A worktree of the last commit before the move, outside
   the repo, is v2 for the prototype's checks (`run.ts`, `compare.ts`,
   `lint-check.ts`), which then check `src/` against it. They stay
   uncommitted for now, like the rest of `benchmark/`.
1. **Syntax, with no change in behavior.** `Shape` gets `"reference"` and
   `"unappliedSchema"`, and `siblings` is a record. Resolving, bundling,
   `schema-group.js`, and lint's `refUri` and `visitReferences` find
   references by shape instead of keyword URIs. `compile` and `check` read
   siblings from the record, so the `siblingKeyword` utility and
   `siblings.test.js` are removed.
2. **The kernel replaces compile and evaluate.** `src/kernel/` replaces
   `src/evaluate/`: the expressions (`kernel.d.ts`, and `kernel.js` for
   `subexpressions`, `readsMarks`, `explainsFailure`, and `conditionsOf`),
   `lower.js`, `normalize.js`, `optimizations/` (one pass per file, as
   today: `static-unevaluated`, folding, leaving out groups), `fast.js`,
   `instrumented.js` (plugins, collecting annotations, and ASTs),
   `validator.js`, and `instance.js`. Merging property loops is part of
   the evaluators, because a merged loop isn't an expression. Each
   keyword gets `lower`, from the prototype's table. `compile.js`,
   `specialize.js`, `optimize.js`, `compile`, `simpleApplicator`, `reads`,
   and the `compileSchemaArray` and `compileSchemaMap` utilities are
   removed. The old and new
   evaluators don't live side by side, because the reference is the old
   one. Without optimizations, hook calls are the same as v2's. Until
   stage 3, the output formats still use `simpleApplicator`'s answers,
   computed from the expression, so the output is the same as v2's too.
   One result changes: `itemPattern` marks the items it matches, which
   "Evaluation state" says it does and the evaluator before the kernel
   didn't.
3. **Plugins and output formats.** `KeywordInfo` gets `expression`,
   `explainsFailure`, and `conditions`, and BASIC and DETAILED stop
   recognizing `if` and `conditional` by URI. The known changes in BASIC
   (`conditional`, `dependencies` with only schemas, `anyOf` and `oneOf` of
   one schema) are the only differences from the reference, and tests that
   pin them change on purpose.
4. **Escape hatches and serializing.** `predicate` and `opaque`, tested
   with user-defined keywords, and `kernel: 1` with `restoreValidator`.
5. **Lint reads expressions.** `lowerForLint` and `Analysis` move to
   `src/lint/` and replace `keywordType`, `const-or-enum-assertions`' list,
   and what's left of finding references by URI. `contradictory-limits` is
   ported. A rule about a particular keyword (`then-else-without-if`) still
   names it, because that's about syntax. Lowering is written so linting
   while resolving (plan item 3) can use it.
6. **Documentation and measurements.** "Compile and evaluate" and the
   sections after it, and the code map, describe the kernel. KERNEL.md
   isn't a draft anymore. BENCHMARKS.md has `src/`'s numbers.

Before the old code is gone for good (the end of stage 2), FLAG and BASIC
can't be slower than v2 on the real-world schemas, and the first
`validate` of a schema can't take more than about 1.5 times as long.

## Known limitations

- `allowRetrieval` can't stop a request that a redirect leads to. It's
  checked on the URL that was asked for and the URL the response came from,
  so a response from a refused URL is never used, but the redirected
  request has already been sent. That's the same protection CORS gives in
  browsers. In Node.js, a request whose sending is the harm, such as a GET
  to an internal endpoint with side effects, isn't prevented. Two stronger
  options: browser's `http(s):` plugin could refuse redirects
  (`redirect: "error"`), which breaks servers that redirect, or a `fetch`
  dispatcher could check the address it connects to, which also stops DNS
  rebinding but needs undici.
- Someone who can change the filesystem could swap a part of a path for a
  symlink between browser's `realpath` and its read. The response's URL is
  checked, but it's the path the plugin resolved, not necessarily what it
  opened. The file is also opened before that second check, though nothing
  is read from it if it's refused. Opening a FIFO or a device can have an
  effect. Schemas are what's untrusted, not the filesystem, so that's out
  of scope.

- `@hyperjump/browser` v2 isn't published, so it's a `file:../browser`
  dependency. `@hyperjump/uri` is `file:../uri` until `encodeIriFragment` is
  published.
- The base URI from a file's path only handles POSIX paths.
- The `JsonSchema` shortcuts (`validate(uri, ...)` and the others) compile the
  schema every time.
- A registry schema can only be identified with a dialect added to the
  `JsonSchema` or defined by a meta-schema in the same registry, because
  identification is synchronous and never retrieves. If its dialect is
  defined by a meta-schema in a different registry or one that's only
  retrievable, it's found by its `retrievalUri` but not by its `$id`.
  Identifying entries per session, across all of its registries, would fix
  that, but then an index would depend on more than its registry, and
  sessions wouldn't be cheap.
- Copying a registry's entries for `with` and indexing the new registry is
  O(n). That's fast for a language server's workspace. If it shows up in
  a profile, an index could build on its parent's index.
- Boolean schemas are allowed in draft-04, which didn't have them. A
  boolean where a schema goes is a boolean schema in every dialect.
- Meta-schemas that depend on each other hang instead of being an error
  if they're retrieved through a redirect. The cycle is detected with the
  resolver's `referencedFrom`, which is the meta-schema's document URI,
  but dialects being loaded are recorded by the URI they were requested
  by. After a redirect, those differ. Fixing it needs browser to give a
  media type plugin the URI that was requested along with the response.
- A self-describing meta-schema's dialect has to be added. One retrieved
  from a URI other than its `$schema` isn't recognized as self-describing,
  so its dialect is looked up like any other.
