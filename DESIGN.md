# Design

A from-scratch rewrite of [`@hyperjump/json-schema`](../json-schema) built on
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
text ─ rejsonParse ─▶ JSON AST ─ jsonSchemaResolve ─▶ Schema AST ─ (schema validation) ─▶ compile ─▶ IR ─ optimize ─▶ IR ─ specialize ─▶ closures
       (browser)                  (async)                                                  (async)                         (sync, lazy)
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
| `src/evaluate/` | Schema AST to results: `compile` (the IR), `optimize`, `specialize`, `Validator`, instance operations, and evaluation plugin types |
| `src/evaluate/optimizations/` | Optimization passes on the IR, one per file. `index.js` lists them in the order they run |
| `src/output/` | Output formats and validation errors |
| `src/retrieval/` | `allowRetrieval`'s defaults for Node.js and browsers, and `RetrievalNotAllowedError` |
| `src/registry/` | `SchemaRegistry`, indexing registries, and how a session finds schemas in them |
| `src/dialects/` | The presets: `v1`, `draft-04` … `draft-2020-12`. Each has the dialect and its tests, including the test suite runners. `add-preset.js` adds a preset's dialect and the definitions it uses |
| `src/keywords/` | Keyword definitions, and `checks.js`, the checks they share for their values |
| `src/formats/` | Format definitions and the lite and full presets |
| `src/bundle/` | Bundling, which embeds referenced schemas in one document, and its tests, ported from v1 |
| `src/lint/` | Lint rules (`rules/`, one per file), the recommended preset, `lintRule`, which applies configuration comments, and the utilities rules share |
| `src/cli/` | The `jsonschema` CLI, which lints schemas |
| `test/test-suite.js` | Runs the JSON Schema Test Suite and the annotation test suite |

- A `.d.ts` next to a `.js` file declares that module's API. One without a
  `.js` file declares a concept (`keyword.d.ts`, `output-format.d.ts`).
- A keyword's or format's path mirrors its URI.
  `https://json-schema.org/keyword/draft-04/items` is
  `src/keywords/draft-04/items.js`. A variant is named after the draft that
  introduced it, so draft-07 uses `draft-04/items`.
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
  `"data"`, `{ array: Shape }`, `{ map: Shape }`, or `Shape[]` (the first
  alternative whose JSON type matches). The shape owns the JSON types of
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
  problem has a position (see "CLI workspace registry" in BENCHMARKS.md).
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

- The `allowRetrieval` config is a predicate on a URL,
  `(url: URL) => boolean | Promise<boolean>`.
- The default depends on where it runs, chosen with the package's
  `#retrieval` import, whose conditions work like browser's `#context-uri`
  (`src/retrieval/`):
  - In Node.js, a `file:` URL is allowed if its real path is in the working
    directory's real path. Nothing else is, so `http(s):` isn't.
  - In a browser, an `http(s):` URL with the page's origin is allowed.
    Nothing else is. Browsers can't read `file:` URLs anyway.
- A file that doesn't exist has no real path, so its path is checked as
  it is. If it's allowed, retrieving it fails as missing instead of being
  refused.
- It's checked in `JsonSchema.retrieve`, which overrides browser's
  `Hyperjump.retrieve`. browser's `Session` calls it for every document that
  isn't in its cache, which is after embedded resources and registries,
  because `JsonSchemaSession.getDocument` finds those first. So it covers
  `get`, following references, `compile`, and meta-schemas found by
  `getDialect`. It's before the URI scheme plugins, so it's before the HTTP
  cache too, and a cached response isn't a way around it. It isn't checked
  in `getDocument`, because a redirect is checked on the response's URL,
  and a schema document's `uri` is its `$id` by then.
- browser's `Session` wraps what `retrieve` throws in a `RetrievalError`.
  `JsonSchemaSession.getDocument` unwraps a `RetrievalNotAllowedError`, so
  it's what `get` and `compile` throw. A refusal while getting a dialect's
  meta-schema is the `cause` of `getDialect`'s error.
- A URL the predicate refuses is a `RetrievalNotAllowedError`, distinct from
  a `RetrievalError` for a URL that was allowed and couldn't be retrieved.
  Tools use the difference: a refused URL is unknown, a failed one is
  missing.
- It's config, because it's a property of the application, like its URI
  scheme plugins, and every session should follow it by default. A session
  can have its own (`SessionOptions.allowRetrieval`), which replaces the
  config's rather than adding to it, for an application that allows
  different things for different sessions, like the CLI does for files with
  different settings. The application creates its sessions, so it's still
  the application's decision. The session passes its predicate in the
  options it gives browser's `getDocument`, which browser passes on to
  `retrieve`, because `retrieve` isn't told which session called it.
- Symlinks are handled by the library, so no predicate has to. A symlink
  inside an allowed directory can point outside it. In Node.js, a `file:`
  URL is replaced with its real path (`realpath`) before `allowRetrieval`
  sees it. browser's file plugin reads the file from its real path, with
  every symlink in the path resolved, and gives that real path as the
  response's URL, which is checked again (see the next item). So what's
  checked is what's read, even if the path changes between the first check
  and the read. There's no cheaper way to tell whether a path goes through
  a symlink than `realpath`, so every `file:` retrieval costs two
  filesystem calls, ours and the plugin's. It can be async for that reason
  too.
- A document read through a symlink is identified by its real path, so its
  relative references resolve from where the file really is, next to the
  files its author wrote it with. That's browser's choice, and it's how
  Node.js resolves modules. Keeping the URL it was asked for was
  considered, but the author of a symlinked file didn't write it relative
  to the link.
- Redirects are checked after the fact. `allowRetrieval` is also called on
  the URL a response came from, after any redirects, and a response from a
  refused URL is a `RetrievalNotAllowedError` whose `uri` is that URL. Its
  body is cancelled. browser's file plugin also gives a symlinked file's
  real path as its response URL, which is checked the same way. browser doesn't follow
  redirects manually, so the redirected request is still sent. Only its
  response can't be used, which is what CORS does in browsers (see "Known
  limitations").
- `() => false` allows nothing, so only registries and embedded resources
  are used. The test suite runners and the tests that only use registries
  use it instead of removing the `http(s):` URI scheme plugins. Tests that
  read files from a temporary directory, outside the working directory,
  use `() => true`.

### The language server

- Its `allowRetrieval` allows the workspace folder. The library compares
  real paths, so a symlink can't lead outside it.
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

Implemented in `src/evaluate/validator.js`.

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
them, and `src/evaluate/optimize.js` runs them. There aren't any yet (see
"Plan").

- A pass is an `Optimization`: `{ fastOnly, optimize }`. `optimize` takes
  the IR and returns a new one. It doesn't change the one it's given,
  because the `Validator` keeps it for its other specializations and for
  `serialize`.
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
  `$dynamicRef`, its vocabularies with `addVocabulary`, and its dialect.
  `$dynamicRef` resolves like `$ref`, and if the schema it resolves to has a
  dynamic anchor named by the fragment, the outermost schema in the dynamic
  scope with that anchor applies instead.
- **2019-09** (`src/dialects/draft-2019-09`, `addDraft201909`) is built the
  same way. It adds `$recursiveAnchor`, `$recursiveRef`, and its own
  `$anchor`, whose names can contain `:` but can't start with `_`. It also
  adds draft-04's `items`, which is a schema or an array of schemas, and
  `additionalItems`, which only has an effect after an array of schemas.
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
  Unknown keywords are ignored. `$ref` is draft-04's, which makes the schema
  a reference, and `id`/`$id` is draft-04's, which can also be an anchor.
  All three add draft-04's `items`, `additionalItems`, and `dependencies`,
  which is `dependentRequired` and `dependentSchemas` in one keyword.
  draft-04 adds `maximum` and `minimum`, which read the sibling boolean
  `exclusiveMaximum` and `exclusiveMinimum`. `format` validates by default,
  as most implementations of these drafts did. Their `format` is
  draft-04's, which makes a format the dialect doesn't have only an
  annotation, as the drafts say. Each dialect only has the formats its
  draft defines, so the draft-04 and draft-06 meta-schemas' `regex` is
  ignored. draft-04 and draft-06 use draft-04's `hostname` (RFC 1123),
  which doesn't need Unicode data.

## CLI (`src/cli/`)

`jsonschema` lints schemas. It's a `unified-args` CLI like browser's
`rejson` and `jref`, with `.jsonschemarc`, `.jsonschemaignore`, and a
`jsonSchemaConfig` field in `package.json`.

- It runs `rejsonParse` and `jsonSchemaResolve`, which finds every problem
  with a schema, and reports their messages. Nothing is compiled. Syntax errors don't stop the file from being resolved, so every
  problem is reported at once.
- Its `JsonSchema` has every preset and no default dialect.
- The engine makes a processor for each file, and each one resolves in a new
  session, with the run's registry.
- The engine finds files in folders by `path.extname`, which is `.json` for a
  `.schema.json` file. The CLI adds the ignore patterns `*.json` and
  `!*.schema.json` before the user's own, so plain JSON files aren't linted
  unless a user's pattern includes them.
- Input from stdin has no path, so it's resolved as if it were in the
  working directory: its base URI is the directory's `file:` URL.
- It doesn't write files to stdout by default (`--no-stdout` comes before
  the user's arguments), because it's a linter. `--stdout` and `--output`
  still work.
- Schema problems are errors, so an invalid schema fails the command. In
  unified, warnings are for findings that don't stop a file from being used,
  like style, and none of these are.
- Its processor isn't exported. Validating instances from the CLI waits for
  the unified plugin for validating JSON files (see "Plan").
- It can see the working directory, and it lints the files it's given.
  Every `.schema.json` file in the working directory is in a registry, as a
  language server has its workspace, so it's found by its `$id` and by its
  path, whether or not it's linted. The files it was given are in the
  registry too, even outside the working directory or with another
  extension. Self-identifying meta-schemas, whose `$id` can't be retrieved,
  are found this way without any configuration.
- `.jsonschemaignore` and ignore patterns only decide what's linted. An
  ignored file is still found, which is what a vendored meta-schema needs.
- The search skips `node_modules` and `.git`, and it doesn't follow
  symlinks. A symlink can point outside the working directory, and what's
  in the registry isn't checked by `allowRetrieval`. A directory that can't
  be read is skipped.
- The working directory is searched and every file is read for each run,
  even to lint one file. Folders are searched and files are read
  concurrently, up to 64 at a time, so it doesn't run out of file
  descriptors. Entries are only identified when a session looks for a
  schema, and only resolved when they're needed. For 3000 files, linting
  one takes about 0.1–0.15 s more than in an empty folder (see "CLI
  workspace registry" in BENCHMARKS.md). A very large repository pays more. Listing registry files in `.jsonschemarc` was considered
  instead, but their paths would have nothing to be relative to (see the
  `allowRetrieval` setting).
- What it can retrieve is files in the working directory, as by default,
  and the URLs in the `allowRetrieval` setting from `.jsonschemarc`.
- The setting is a list of `http:` or `https:` URLs. One that ends with `/`
  allows everything under it, compared after the URL is parsed, so dot
  segments and the host can't get around it. Any other allows only itself.
  Anything else is an `invalid-setting` error.
- Files can't be in the setting. A committed configuration file can't name
  an absolute path, which differs for everyone and could point anywhere,
  and a relative one has nothing to be relative to. The engine merges
  settings without saying which configuration file they came from. Its
  `configTransform` option has the file's path, but `unified-args` doesn't
  pass it on. A file outside the working directory has to be given to the
  CLI.
- Files in different folders can have different `.jsonschemarc` files, so
  each file's session gets its own `allowRetrieval`, and every file shares
  one `JsonSchema`. A `JsonSchema` for each setting was considered, but each
  would index the registry again.
- The engine only gives the set of files it's processing to plugins from
  configuration, as their third argument. So the CLI adds its own plugin
  (`src/cli/file-set.js`) with `--use`, before the user's arguments, and it
  records the file set for the processor. Every plugin is attached before
  any file is transformed, so the resolve step finds it.
- Each run has its own registry, so watch mode sees new and edited files.
  A run in watch mode only has the file that changed, so the files given in
  earlier runs are kept.
- A file the engine couldn't find, or was told to ignore, isn't one it was
  given, though an ignored one in the working directory is still found.
  Input from stdin can't be found by other files.
- Without the engine, such as when the processor is used directly in tests,
  there's no run, so the registry is empty and nothing is searched.

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

- A keyword with no effect (`then` without `if`, `minContains` without
  `contains`, draft-04's `exclusiveMaximum` without `maximum`), a reference
  to something missing, and an unknown `format` that's only an annotation
  are lint. The schema still works.
- An unsupported `format` when formats are validated is validity, because
  the schema can't be compiled. It's a compile error today and moves to the
  `format` keyword's `check`.
- `check` stays for validity only. Its context doesn't get access to
  siblings, other schemas, or warnings. Rules read the resolved AST instead.

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
  `remark-preset-lint-recommended`. A project's `.jsonschemarc` uses a
  preset and adjusts rules. The CLI loads plugins with the `jsonschema`
  prefix.
- Rules find keywords by keyword URI, never by name, so a rule works in
  every dialect with the keyword and does nothing if the keyword isn't
  loaded. A rule about a draft-specific keyword uses that keyword's URI.
- Utilities in `src/lint/` keep rules short: visit every schema, visit every
  keyword by URI, get a sibling keyword, and find what a reference points
  to. They know nothing about particular keywords.

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
    every rule. The rules in `.jsonschemarc` are added after the CLI's
    processor's plugins, so it would run first and see nothing.
  - Its marks are points where rules turn off or on, in document order, not
    ranges that nest. A directive in a subschema would change the state for
    the rest of its parent, too.
  - What it has that this doesn't: `ignore` (the next node only), its
    `reset`, `enable`, and `disable` options for the initial state, which
    `.jsonschemarc` severities cover, and dropping messages in gaps in the
    tree, which a schema AST doesn't have. It controls any rule's messages
    by source, and this only controls rules made with `lintRule`.
- A rule made with `unified-lint-rule` directly ignores configuration
  comments, and naming it in a directive is an `unknown-rule` warning.
- Configuration comments from JSONC comments are deferred (see "Plan"). They
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

- **Portable bundles.** A bundle that's a folder of schemas (a tar?) rather
  than one compound document, so schemas can be moved between machines and
  implementations (a JS frontend and a C# backend) and restored in one step,
  straight into a registry. Paths would be the retrieval URIs. Unclear: how
  paths map to URIs, whether `$id`-less schemas need a base, and what other
  implementations would need to adopt it. v1-style bundling comes first.

## Plan

1. Optimization passes on the IR (see "Optimizations"). Candidates: fold
   constants (`not: true`, an `enum` with one value), inline `$ref` targets
   that are only used once, evaluate cheap keywords first, and share
   identical subschemas.
2. Decide whether keywords can provide a separate evaluator for plain
   values (see "Compile and evaluate").
3. Later: OpenAPI, a unified plugin for validating
   JSON files (and validating instances from the CLI), and migrating
   dependent projects.

JSONC support in the CLI, with configuration comments from JSONC comments,
was planned and is deferred, because it may not be worth it.

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
