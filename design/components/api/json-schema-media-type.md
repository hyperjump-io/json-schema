# JSON Schema as a media type

Browser already has a model for a kind of document: a session is a
`Hyperjump`, its config is a plain value, and a media type plugin knows how
to read one kind of document. JSON Schema is that model with more config
on top: dialects, keywords, formats, vocabularies, `validateFormats`,
`defaultDialects`, and a registry. The definitions are on the JSON Schema
media type plugin and registries are in browser, so JSON Schema is a media
type, a session is a plain `Hyperjump`, and the long-lived value is a
`HyperjumpConfig`.

```js
import { BASIC, jsonSchemaConfig, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const config = jsonSchemaConfig({ dialects: [v1Dialect] });

const isPerson = await validator(config, "https://example.com/person", { registry, output: BASIC });
const session = new Hyperjump({ ...config, registry });
```

Rejected:

- A `JsonSchema` as a concept of its own, made by a function with a
  config type apart from browser's, and a `JsonSchemaHyperjump` session
  subclass. Its `jsonSchema` property and its `fetch`, which answered from
  the registries, were all the subclass added to a `Hyperjump`, and
  retrieving a schema needed a session of that class. Any `Hyperjump` with
  the plugin can.

## Making a config

`jsonSchemaConfig(options)` (`src/json-schema.js`) makes the config. The
media types are made by `jsonSchemaMediaTypes` (`src/media-types.js`),
which isn't exported.

```js
const config = jsonSchemaConfig({ dialects: [v1Dialect], mediaTypes: [jrefMediaType], allowRetrieval });
```

- It takes the definition options and browser's config options, and
  returns browser's options as they are, with `mediaTypes` the JSON Schema
  media types made from the definition options, then the options'
  `mediaTypes`. It adds nothing else: no stack, so
  [Sharing the HTTP cache](#sharing-the-http-cache) stands, and no object
  with state. The config is a plain value, spread to make another.
- The order of the media types can't be wrong, and the simple path doesn't
  mention media types. Rejected: `{ mediaTypes: jsonSchemaMediaTypes({
  dialects }) }`, which made the first thing a user writes about browser's
  media type plugins, and adding JRef meant putting it after the JSON
  Schema ones by hand.
- Its type infers the schema type from the dialects and the other media
  types (`M`) from `mediaTypes`, so a session made from the config types
  what it finds by all of them.
- [Sharing the HTTP cache](#sharing-the-http-cache) rejected a function
  that makes the whole config with a stack, and browser rejected a class
  that holds a configuration and makes sessions. This one does neither: it
  only works out `mediaTypes`.
- It's named for what it returns, a `JsonSchemaConfig`, like `validator`
  and `annotator`. Rejected: `configureJsonSchema`, which sounds like an
  action.
- Rejected: exporting `jsonSchemaMediaTypes` too, for an application that
  has a browser config already. It passes it in instead
  (`jsonSchemaConfig({ ...browserConfig, dialects })`), so there's one
  way to make a config.

## Definitions on the plugin

- `jsonSchemaMediaTypes(options)` builds the definition tables once and
  returns the schema plugin and the JSON-or-schema plugin, frozen. The
  schema plugin has a `definitions` property: the tables and
  `validateFormats`. `defaultDialects` isn't a definition. It's in the
  config, like `allowRetrieval`, so a session can replace it (see
  [Default dialects](../dialects/default-dialects.md)). The JSON-or-schema plugin is
  the same for every config, because nothing in it reads the definitions
  except through the session.
- What needs the definitions finds them with `definitionsOf(config)`
  (`src/definition-of.js`), the `definitions` of the first media type that
  has them: resolving, identifying registry entries, lowering, `compile`'s
  and `restore`'s kernel definitions, lint (`document.js`), `getDialect`,
  and `annotation`. Parsing a schema reads them from the session's config
  the same way, so a plugin's `parse` only needs the session for what
  browser already gives it: retrieving a meta-schema, and `session.state`.
  A config without them is a `TypeError` that says to make it with
  `jsonSchemaConfig`.
- Operations take the config (`JsonSchemaConfig<S>`), and make a session
  for each call (`callSession`, `src/operations/call-session.js`): the
  config, with the call's `allowRetrieval` instead of the config's, and the
  config's registry combined with the call's with `concat`.
- What's cached across sessions (registry entries' identifications,
  registry indexes, and resolved registry entries) is keyed by the
  definitions.
- The schema type `S` comes from the schema plugin's type
  (`SchemaMediaType<S>`), found in `config.mediaTypes`, which also gives
  `SchemaTypeOf<C>`. A type-only property, `[schemaType]`, carries it,
  because nothing at runtime has to.
- The CLI's config adds `jrefMediaType` after the JSON Schema media types,
  and a stack with an HTTP cache, because it retrieves the same schemas for
  many files.

### Sharing the HTTP cache

As browser does it: calls share an HTTP cache when the config they're
given has a `stack` with one, and there's none by default.
`jsonSchemaConfig`'s `httpCache` option puts one on the stack.

```js
const config = jsonSchemaConfig({
  dialects: [v1Dialect],
  // Only for calls to share an HTTP cache
  httpCache: new MemoryCacheStore()
});
```

- `httpCache` is the cache's store, where it keeps responses: browser's
  `MemoryCacheStore` or `FileCacheStore`, or the application's own
  `CacheStore`. `jsonSchemaConfig` makes the cache, on top of the options'
  `stack` or browser's default stack
  (`compose(httpCache({ store }))(stack)`), so every call and session made
  with the config shares it. Writing the stack out would mean knowing
  browser's layers to retrieve less. It's still the application's choice,
  so the default stays without one. In a browser it throws, as browser's
  HTTP cache does, because the browser caches responses itself. Bundles
  have browser's stub for it, about 0.3 kB. Rejected: `true` for one in
  memory, which hides that there's a choice of where, and browser's
  `HttpCacheOptions`, whose other options, like `shared`, are rare enough
  to put the cache on the `stack` for.
- Browser's config is a plain value, and sessions share a stack by being
  made from the same one (`{ stack: defaultStack() }`). Its default stack
  has no HTTP cache, because it lives as long as its session, and a web
  browser caches already (see browser's `design/components/sessions.md`).
- Without a `stack`, each call's session has a default stack of its own, so
  a remote schema is retrieved again for each compile. The results are the
  same. Only `http:` and `https:` are cached at all: a file is read each
  time, and a registry's schema isn't retrieved, so it matters for remote
  schemas compiled more than once, like a service that compiles for each
  request. A config made in a function that's called for each request has
  a cache for each request, which is no cache, not a wrong one. In a web
  browser, nothing changes, because the platform's cache is under every
  stack.
- The docs show the stack with a cache on the retrieval page, as a way to
  retrieve less, not in the simple path. Most schemas are files or in a
  registry.

Rejected:

- A default stack with an HTTP cache in Node.js that every session made
  from a config shares. That decides for the application that its
  sessions belong together, which browser leaves to whoever builds the
  stack (see browser's `design/principles/state-lifetimes.md`).
- One default stack for every session without one, in browser or here.
  Browser rejected it: sessions that never said they belong together would
  share the scheduler's limits and whatever else the stack keeps. It's also
  module state (see [No global state](../../principles/no-global-state.md)).
- `jsonSchemaMediaTypes` making a stack and returning it with the plugins,
  as a config to spread. A media type plugin doesn't decide how things are
  retrieved, and two of them would each bring one.
- A function that makes the whole config with the stack. Browser rejected
  a class that holds a configuration and makes sessions, because a plain
  object holds it already.

## A registry in browser, identification here

- Browser's is a config's `registry` (`src/registry.js` there), and
  `registry(entries, { base })` makes one by URL. What it answers is in
  traces with the source `"registry"`, and what it throws is recorded like
  a failed fetch.
- `SchemaRegistry`'s `get` is `registryResponse`
  (`src/registry/registry-lookup.js`), which also has the index cache and
  the resolved entries, shared for the definitions or kept in the
  session's state. A session is `new Hyperjump(config)`. The schema
  plugin's `parse` doesn't check what session it's in, and the
  JSON-or-schema plugin reads JSON as JSON in a session whose config
  doesn't have the definitions.
- An operation adds a schema it's given as a value to the call's registry
  (`callSession`), and checks that no other schema in it has the value's
  `$id` (`assertOnlyValue`). The error is the index's, "More than one
  schema in the registry is found by", like any other two schemas with one
  identifier.

Where each part of a registry is:

| What | Where |
| --- | --- |
| Answers before `allowRetrieval` and the stack | Browser |
| Finds a schema by its `$id`, which depends on the dialect, which a meta-schema in the registry can define | Here |
| Combines the config's registry with the call's | Here, before the session |
| Resolves an entry once for every session that can share it | Here |
| Adds a schema an operation is given as a value | Here, before the session |
| Explains a retrieval that might have been for one of its schemas | Here |
| Keeps where an entry came from (`origin`) | Here |

### In browser

- A session's `registry` has the documents the application already has.
  `Hyperjump`'s `fetch` asks it before `allowRetrieval` and the stack.
  `allowRetrieval` keeps a document from making the session fetch whatever
  it names, and a document the application gives the session isn't
  fetched. So what the registry answers doesn't have to be allowed, unlike
  what a layer answers, because it isn't a layer.
- A registry is an object browser asks for a URL: `get(url, ctx)` returns
  a response, or nothing to go on to `allowRetrieval` and the stack. It can
  throw, like any fetch. Browser exports a registry of entries by URL: a
  body, the parts of a response, or a function that makes one.
- A registry's answer is in a trace, with `source: "registry"` and no
  network timing. Whether a document came from the registry or was
  retrieved is the first thing to find out when a registry doesn't do
  what's expected.
- A redirect to a registered URL is retrieved: the registry only answers
  what the session is asked for. `SchemaRegistry` finds an entry by its
  `retrievalUri` and its `$id` already. Rejected: answering a redirect's
  URL, which would make an entry that's a redirect an alias. It can be
  added if something needs it.

### Here

- `SchemaRegistry` is a registry browser can ask. Its `get` finds the
  schema plugin in `ctx.session.config.mediaTypes`, identifies its entries
  with the plugin's definitions, cached for each plugin and entry, and
  answers with a response. `RegistryIndex` and the identification caches
  are keyed by the plugin. Browser doesn't know what an `$id` is.
- An entry resolved with only the config's dialects is shared by every
  session: its response is made by a function that gets `ctx.session`,
  resolves the entry in the first session that asks, and answers the next
  with a `DocumentResponse`. Browser doesn't know that a parse can be
  shared.
- An operation combines the config's registry with its own with `concat`,
  and adds a schema it's given as a value
  (`registry.with(value, { retrievalUri: "urn:uuid:…" })`), before it makes
  the session. The session's registry never changes after it's made. An
  application that makes a session combines them the same way:
  `new Hyperjump({ ...config, registry: config.registry.concat(mine) })`.

### Explaining a miss

An entry can be in a registry and not found by its `$id`:

- It's waiting for its dialect: its `$schema` isn't a config dialect, and
  no meta-schema in the registry defines it, like a meta-schema that's only
  retrievable, or a typo. It's found by its `retrievalUri`, but which
  keyword is the `$id` depends on the dialect.
- It can't be identified: its text isn't JSON, or its `$id` is invalid or
  a `file:` URI. It's found by its `retrievalUri`, and finding it throws a
  `SchemaError` with the problem. Without one, nothing can find it.

The registry's `get` explains only a URL that's probably one of its
entries. A waiting entry's root usually has `$id` or `id`, and resolving it
against the `retrievalUri` gives a URL it would be found by. When that's
the URL asked for, `get` throws, and nothing is retrieved:

> 'https://example.com/person' is in the registry, but it can't be
> identified until the 'https://example.com/my-dialect' dialect is
> defined.

- The same goes for an entry that can't be identified, when its root's
  `$id` probably is the URL: its problem is thrown, like "can't be
  identified by a 'file:' URI".
- An unrelated miss keeps its own error.
- A schema that's also retrievable at its `$id` isn't retrieved instead of
  the registry's copy, which the application said it has.
- Guessing without the dialect can only be wrong one way: a draft-04
  schema with only `$id`, which draft-04 doesn't use, matches, and it's an
  entry that can't be used anyway.
- An entry with nothing to go by, that can't be identified and has no
  `retrievalUri`, isn't explained. Nothing can find it, so no miss is
  about it. The tools that have broken files, like the CLI and a language
  server, lint each file themselves, and report its problem where it is
  with its `origin`.

Rejected:

- Browser identifying entries, with a media type plugin hook
  (`identify(text, registryDialects)`) and the loop over entries waiting
  for a dialect another entry defines. It would put JSON Schema's
  dependencies between documents in browser (see
  [Browser stays generic](../../principles/browser-stays-generic.md)).
- A registry that's a layer on the stack, of documents by URL. What any
  layer answers has to be in `allowRetrieval`, so a cached response isn't
  a way around the list, and an application's own layer can answer the
  documents it has. For JSON Schema, every registered URL would have to
  be allowed, a schema added to a session later couldn't be, and every
  session would parse the registry again.
- A registry that's a value of entries by URL, which browser only looks
  up. Identifying needs the definitions, so every session an application
  makes would need its registry identified first
  (`toBrowserRegistry(config, schemaRegistry)`). A `SchemaRegistry` given
  to any config works as it is.
- The session's `fetch` catching every failed retrieval, and, if any
  registry has an entry that's waiting or can't be identified, throwing an
  `AggregateError` of the failure and those problems. It can't know which
  entry was asked for, so every failed retrieval in that session gets the
  registry's message, even one for an unrelated typo in a `$ref`.
- `registry.explainMiss(url)`, which browser would add to a failed
  retrieval's error. It's a hook for what `get` throwing already does.
- This package catching retrieval errors in `get` and the operations, to
  add the registry's problems. It wouldn't cover a user's own retrieval,
  and it would explain every miss.

## `annotation`

`annotation(config, node, keyword, dialectUri?)` (`src/annotation.js`)
looks the name up in the plugin's dialects, with v1 as the default. A
dialect a meta-schema defines is read by keyword URI. It's apart from the
session's module, since it doesn't need a session: operations have
sessions of their own, so the one `annotate` used, which built any dialect
from a meta-schema, is gone by the time `annotation` is called anyway.

## Names and media types

- The factory is `jsonSchemaMediaTypes`, because what it returns replaces
  browser's `defaultMediaTypes` in a config. The docs call what it goes in
  "the config", as browser does, and name it `config`. Rejected: exporting
  the schema plugin and the JSON-or-schema plugin on their own, because
  each plugin has its definitions.
- It returns the schema plugin and the JSON-or-schema plugin, in that
  order, and nothing else. JSON-or-schema reads JSON that isn't a schema
  too, so browser's JSON plugin isn't needed. A config with it doesn't
  read JRef, which browser's `defaultMediaTypes` does. An application that
  needs it adds it, and other media types, in `jsonSchemaConfig`'s
  `mediaTypes`, which come after them.
- A lint session is `file.data.jsonSchemaSession`, a `Hyperjump`. A lint
  rule finds the definitions the way an operation does, from the schema
  plugin in `session.config.mediaTypes`. Rejected: a key like
  `file.data.session`, which could be another unified plugin's.

## Rejected

- Operations taking only a session. It makes session lifetime every
  user's problem, even for one validation (see
  [Validation API](../validation-api/README.md)).
- Registries as a layer on the stack, for the reasons in
  [A registry in browser](#a-registry-in-browser-identification-here).
- JRef in `jsonSchemaMediaTypes`. A schema doesn't need it, and adding it
  after the factory's plugins can't get the order wrong.
- `jsonSchema(…)` for the factory. It doesn't say it's a list of media
  types.
