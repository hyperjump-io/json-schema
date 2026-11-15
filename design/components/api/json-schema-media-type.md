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

## Stage 2: registries in browser

Browser removed `Registry` because a registry is JSON Schema's concept: a
schema is found by its `$id`, and which keyword is the `$id` depends on the
dialect. Its plan also records why a layer on the stack was rejected: every
registered URL would have to be in `allowRetrieval`, a schema added to a
session later couldn't be, and every session would parse the registry
again. Moving registries back has to answer those.

- A `Hyperjump`'s `fetch` answers from its `registry` before
  `allowRetrieval` and the stack, as `JsonSchemaHyperjump`'s `fetch` does
  now. A registry's schema isn't retrieved, so `allowRetrieval` doesn't
  apply to it, and it isn't in a trace.
- A media type plugin identifies its documents with a new hook, like
  `identify(text, registryDialects)`, so browser keys entries without
  knowing what an `$id` is. A registry entry has a media type, which the
  schema plugin gets from `dialectUri` (as the `Content-Type`'s `schema`
  parameter) or the entry's text.
- What "Making sessions cheap" relies on moves with it: identifications and
  indexes cached for a plugin and an entry, entries resolved once for
  every session that can share them, and the `DocumentResponse` that hands
  a resolved document to the plugin.
- A schema an operation is given as a value is added to the session's
  registry, as `SessionRegistries.addValue` does now.
- When a retrieval fails, the error says if a schema in a registry is
  waiting for its dialect or can't be identified, as now.

`SessionRegistries`, `RegistryIndex`, and their caches move to browser.
`SchemaRegistry` could stay here, as an iterable of entries browser reads,
or move too.

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
- Registries as a layer on the stack, for the reasons in browser's plan
  above.
