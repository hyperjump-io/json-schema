# JSON Schema as a media type

Proposed 2026-11-14. Nothing here is decided or built yet.

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

### Decision needed: sharing the HTTP cache

Every session of a `JsonSchema` shares its stack, which has an HTTP cache
in Node.js (`#default-stack`). It's what keeps `validator(jsonSchema, uri)`
from retrieving again on every call, because each call has a session of
its own. A `Hyperjump` without a `stack` makes a stack of its own, so with a
plain config, each call would start with an empty cache.

- The config has a `stack`, and the docs say to make the config once. It's
  easy to miss, and a config made in a function that's called for each
  request has a cache for each request.
- Browser's default stack is shared by every session without one. That's
  module state, which [No global state](../../principles/no-global-state.md)
  rules out.
- `jsonSchemaMediaTypes` makes a stack and returns it with the plugins, as
  a config to spread. A media type plugin shouldn't decide how things are
  retrieved, and two of them would each bring one.
- A function that makes the whole config (`jsonSchemaConfig(…)`), with the
  stack, is `configureJsonSchema` again under another name.

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
