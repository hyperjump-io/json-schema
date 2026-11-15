# JSON Schema as a media type

Proposed 2026-11-14. Nothing here is built yet. Sharing the HTTP cache is
decided. The rest isn't.

Browser already has a model for a kind of document: a session is a
`Hyperjump`, its config is a plain value, and a media type plugin knows how
to read one kind of document. A `JsonSchema` is that model with more config
on top: dialects, keywords, formats, vocabularies, `defaultDialectUri`,
`validateFormats`, and a registry. The idea is to put the definitions on the
JSON Schema media type plugin and registries in browser, so JSON Schema is a
media type, a session is a plain `Hyperjump`, and the long-lived value is a
`HyperjumpConfig`.

```js
import { BASIC, jsonSchemaMediaTypes, validator } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const config = { mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }) };

const isPerson = await validator(config, "https://example.com/person", { registry, output: BASIC });
const session = new Hyperjump({ ...config, registry });
```

## What it would remove

- `JsonSchema` as a concept of its own, with `configureJsonSchema` and a
  config type apart from browser's.
- `JsonSchemaHyperjump`, once registries are in browser. Its `jsonSchema`
  property and its `fetch`, which answers from the registries, are all it
  adds to a `Hyperjump`. `isSession` goes, and so does the error for
  retrieving a schema in a session that isn't a JSON Schema session: any
  `Hyperjump` with the plugin can.
- `configureJsonSchema` putting the schema plugins before the config's
  media types. The factory returns them in the order they have to run.

## Stage 1: definitions on the plugin

- `jsonSchemaMediaTypes(config)` builds the definition tables once, as
  `configureJsonSchema` does now, and returns the schema plugin and the
  JSON-or-schema plugin, which share them. `parse` reads its own
  definitions. It only needs the session for what browser already gives a
  plugin: retrieving a meta-schema, and `session.state`, where the dialects
  built from meta-schemas already are.
- What needs definitions without parsing finds the schema plugin in
  `config.mediaTypes`: `compile` (the kernel's definitions), `restore`,
  lint (`document.js`), and `annotation`. A config without it is an error
  that says to add `jsonSchemaMediaTypes`.
- Operations take a `HyperjumpConfig` with the plugin, and make
  `new Hyperjump({ ...config, registry, allowRetrieval })` for each call.
  `JsonSchemaHyperjump` stays for this stage, only for registries.
- What's cached for a `JsonSchema` now (registry entries'
  identifications, registry indexes, and resolved registry entries) is
  keyed by the plugin. That changes the key, not the code.
- The schema type `S` comes from the plugin's dialects, found in
  `config.mediaTypes`, instead of from `JsonSchema<S, M>`. The config's
  media types, `M`, are the rest of the list.

### Sharing the HTTP cache

Decided 2026-11-14: as browser does it. Calls share an HTTP cache when the
config they're given has a `stack` with one, and there's none by default.

```js
const config = {
  mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }),
  // Only for calls to share an HTTP cache
  stack: compose(httpCache())(defaultStack())
};
```

- Every session of a `JsonSchema` shares its stack, which has an HTTP
  cache in Node.js (`#default-stack`). That decides for the application
  that its sessions belong together, which browser leaves to whoever builds
  the stack (see browser's `design/principles/state-lifetimes.md`). It's
  also the only reason a `JsonSchema` has a `stack`. Stage 1 removes
  `src/default-stack.js`, `src/default-stack.browser.js`, the
  `#default-stack` import, and the `stack` member.
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

- One default stack for every session without one, in browser or here.
  Browser rejected it: sessions that never said they belong together would
  share the scheduler's limits and whatever else the stack keeps. It's also
  module state (see [No global state](../../principles/no-global-state.md)).
- `jsonSchemaMediaTypes` making a stack and returning it with the plugins,
  as a config to spread. A media type plugin doesn't decide how things are
  retrieved, and two of them would each bring one.
- A function that makes the whole config with the stack
  (`jsonSchemaConfig(…)`). It's `configureJsonSchema` under another name,
  and browser rejected a class that holds a configuration and makes
  sessions, because a plain object holds it already.

## Stage 2: a registry in browser, identification here

Browser has had a registry twice. `f07120c` added a layer of documents by
URL, whose entries were a body, the parts of a response, or a function
that makes one. `6fdbb40` (2026-11-12) removed it, because an application's
own layer can answer the documents it has, and because what any layer
answers has to be in `allowRetrieval`, so a cached response isn't a way
around the list. Its plan also records why a layer was wrong for JSON
Schema: every registered URL would have to be allowed, a schema added to a
session later couldn't be, and every session would parse the registry
again.

What this package's registry does now, and where each part would go:

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
  `Hyperjump`'s `fetch` asks it before `allowRetrieval` and the stack, as
  `JsonSchemaHyperjump`'s `fetch` does now. `allowRetrieval` keeps a
  document from making the session fetch whatever it names, and a
  document the application gives the session isn't fetched. That reverses
  `6fdbb40`'s rule that what a layer answers has to be allowed, for this
  one place, which isn't a layer.
- A registry is an object browser asks for a URL: `get(url, ctx)` returns
  a response, or nothing to go on to `allowRetrieval` and the stack. It can
  throw, like any fetch. Browser exports a registry of entries by URL, with
  the entries `f07120c` had.
- Open: whether a registry's answer is in a trace, as it was in a HAR
  before `6fdbb40` (`_source: "registry"`), and whether a redirect to a registered
  URL is answered by the registry, which makes an entry that's a redirect
  an alias.

### Here

- `SchemaRegistry` is a registry browser can ask. Its `get` finds the
  schema plugin in `ctx.session.config.mediaTypes`, identifies its entries
  with the plugin's definitions, cached for each plugin and entry as now,
  and answers with a response. `RegistryIndex` and the identification
  caches stay, keyed by the plugin. Browser doesn't know what an `$id` is.
- An entry resolved with only the config's dialects is shared by every
  session, as now: its response is made by a function that gets
  `ctx.session`, resolves the entry in the first session that asks, and
  answers the next with a `DocumentResponse`. Browser doesn't know that a
  parse can be shared.
- An operation combines the config's registry with its own with `concat`,
  and adds a schema it's given as a value
  (`registry.with(value, { retrievalUri: "urn:uuid:…" })`), before it makes
  the session. The session's registry never changes after it's made.
  `SessionRegistries`, with its list of values added later, goes. An
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

Now, the session's `fetch` catches every failed retrieval, and if any
registry has an entry like that, it throws an `AggregateError` of the
failure and those problems, with the first problem's message. It can't
know which entry was asked for, so every failed retrieval in that session
gets the registry's message, even one for an unrelated typo in a `$ref`.

Instead, the registry's `get` explains only a URL that's probably one of
its entries. A waiting entry's root usually has `$id` or `id`, and
resolving it against the `retrievalUri` gives a URL it would be found by.
When that's the URL asked for, `get` throws, and nothing is retrieved:

> 'https://example.com/person' is in the registry, but it can't be
> identified until the 'https://example.com/my-dialect' dialect is
> defined.

- An unrelated miss keeps its own error.
- A schema that's also retrievable at its `$id` isn't retrieved instead of
  the registry's copy, which the application said it has.
- Guessing without the dialect can only be wrong one way: a draft-04
  schema with only `$id`, which draft-04 doesn't use, matches, and it's an
  entry that can't be used anyway.
- An entry that can't be identified and has no `retrievalUri` isn't
  explained. Nothing can find it, so no miss is about it. The tools that
  have broken files, like the CLI and a language server, lint each file
  themselves, and report its problem where it is with its `origin`.
- `missReasons`, and the `AggregateError`, go. So does the need for the
  session's `fetch` override, and with it `JsonSchemaHyperjump`: a session
  is `new Hyperjump({ ...config, registry })`.

Rejected:

- Browser identifying entries, with a media type plugin hook
  (`identify(text, registryDialects)`) and the loop over entries waiting
  for a dialect another entry defines. It would put JSON Schema's
  dependencies between documents in browser (see
  [Browser stays generic](../../principles/browser-stays-generic.md)).
- A registry that's a value of entries by URL, which browser only looks
  up. Identifying needs the definitions, so every session an application
  makes would need its registry identified first
  (`toBrowserRegistry(config, schemaRegistry)`). A `SchemaRegistry` given
  to any config works as it is.
- `registry.explainMiss(url)`, which browser would add to a failed
  retrieval's error. It's a hook for what `get` throwing already does.
- This package catching retrieval errors in `get` and the operations, to
  add the registry's problems. It wouldn't cover a user's own retrieval,
  and it explains every miss, like now.

## Stage 3: `annotation`

`annotation(config, node, keyword, dialectUri?)` looks the name up in the
plugin's dialects, with v1 as the default. A dialect a meta-schema defines
is read by keyword URI. A session isn't needed: since operations have
sessions of their own, the one `annotate` used, which built any dialect
from a meta-schema, is gone by the time `annotation` is called anyway.

## Open questions

- The names: `jsonSchemaMediaTypes`, and what the docs call a config with
  it.
- Whether JRef comes with the factory's plugins, as `configureJsonSchema`
  adds it now.
- `file.data.jsonSchemaSession` becomes a plain `Hyperjump`, so lint rules
  find the definitions the way operations do.
- Whether stage 1 is worth doing without stage 2. It removes `JsonSchema`,
  but a session still has to be a `JsonSchemaHyperjump` to see registries.

## Rejected

- Operations taking only a session. It makes session lifetime every
  user's problem, even for one validation (see
  [Validation API](../validation-api/README.md)).
- Registries as a layer on the stack, for the reasons in stage 2.
