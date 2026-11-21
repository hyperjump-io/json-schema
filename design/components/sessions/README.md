# Sessions

With one document cache for a config's whole life, a registry for
one compilation would be visible to compilations running at the same time,
and nothing could be removed without leaving resolved documents behind that
depended on it. So state is separated by how long it lives.

## Two levels

| Level | What it is | What it has |
| --- | --- | --- |
| Long-lived | the config | the JSON Schema media types, with the definitions (keywords and their schemas, formats, dialects), the `registry` every call sees, and the stack, if it has one |
| Session | a `Hyperjump` made by `new Hyperjump(config)` | browser's session, its config's `registry`, the documents it retrieves, its resources, and the dialects it builds from meta-schemas |

- The long-lived level only has state that doesn't depend on a session.
  Definitions, and a stack with an HTTP cache if the config has one, are
  the same for every session made from it (see
  [JSON Schema as a media type](../api/json-schema-media-type.md)). Anything that depends on registries, including every resolved
  document, belongs to a session and goes away with it, so nothing is ever
  left behind.
- The config is browser's: browser has one level, a session, made from a
  configuration that's a value, and a session is made from the config
  (see [Browser v2](../browser-v2.md)).
- A session is browser's, a `Hyperjump`, with nothing added. So browser's
  `browse` and `jref*` functions take it, schemas are browsed
  with browser's own functions, and it's traced, observed, and closed like
  any browser session (`new Trace(session)`).
  - Its config's `registry`, a `SchemaRegistry`, is asked before
    `allowRetrieval` and the stack. A registry's schema isn't retrieved, so
    `allowRetrieval` doesn't apply to it (see
    [Registries](../registries/README.md)).
  - Rejected: a subclass whose `fetch` asks the registries (see
    [JSON Schema as a media type](../api/json-schema-media-type.md)), and a
    plain value, `{ hyperjump, jsonSchema, fetch, state, contextUrl,
    config }`, that copies some of a `Hyperjump`'s members and reaches the
    rest through `hyperjump`.
- What this package adds to browsing is a function of a session,
  `getDialect(session, uri)`. `browse` is browser's, exported from here as
  it is. `annotation` doesn't need a session: it
  takes the config (see
  [Annotations](../validation-api/annotations.md)).
- What a session keeps for schemas is in its state (`session.state`),
  made the first time it's needed: the dialects it built, and the registry
  entries it resolved that can't be shared. A session
  can have different resources for a URI (see
  [Schema AST](../../specs/schema-ast.md)), which only what combines
  documents checks.
- There's no default session. Browsing needs a session, because a node
  needs one to follow references.
- An operation takes the config (`compile(config, uri, { registry })`)
  and starts a session for that call, so each call sees changes, and calls
  that run at the same time can't see each other's registries. It never
  takes a session (see [Validation API](../validation-api/README.md)). A compiled schema doesn't need its session
  after compiling, because its kernel is self-contained. Sessions only
  browse; compiling, bundling, and linting are functions (see
  [Validation API](../validation-api/README.md)).
- A schema with problems fails its retrieval with its `SchemaError`, which
  is what `browse` and the operations throw. Nothing wraps it.
- Dialects the media types were made with are in their definitions, and
  they're found there first. A dialect built from a meta-schema belongs to the
  session that built it. `getDialect(session, uri)` finds both, and it's
  what the resolver and the compiler use.
- Browser gives a media type plugin the session a document is being
  retrieved in (`parse(response, session)`), so the schema media type
  plugins resolve schemas in that session, with the definitions in its
  config. Any session whose config has them can.
- What a session finds is typed by its media types. A reference can lead to
  any document the session can read, so `browse` and the `jref*` functions
  return a target whose node is a schema's node, a JSON node, or a node of
  another of the config's media types, like JRef, and a schema's node is
  told by its `type`, `"json-schema"`.
  - `Hyperjump<C>` has its config's type, so its media types are in the
    type too.
  - A session that's only known as a `Hyperjump<JsonSchemaConfig>` could have any
    media types, so what it finds is a target whose document and node are
    `unknown`. `isSchemaNode` and
    `isSchemaDocument` narrow it, and they're what this package's own code
    uses where it needs a schema.

Rejected:

- `browse`, `getDialect`, and `annotation` as methods of the
  session. They'd forward to browser's functions, and its `browse` would be
  browser's with another call shape.
- `browse` typed as returning a schema's. A reference
  can lead to a document that isn't a schema, like a JRef or a JSON file,
  so the type would be wrong whenever one did.
- The config's media types left out of a session's type. A session with a
  media type of the application's could find one of its nodes, which the
  type wouldn't say.
- Resolving after retrieving, to take the session out of browser's
  `parse`: browser would only parse, and a `browse` of this package's
  would resolve what it returns. It moves the dependency instead of
  removing it. Resolving still needs the session, for dialects, and moving
  it needs a cache of resolved documents next to browser's, the
  `Content-Type`'s `schema` and `profile` parameters carried on the parsed
  document, and the check that a `.json` file is a schema moved out of the
  plugin. `parse` is where the response is, so it's where resolving
  belongs. Browser's extension point isn't about JSON Schema either: any
  media type that needs other resources to parse a document, like XML with
  external entities or JSON-LD contexts, needs the session there.

## Contents

- [What can be retrieved](allow-retrieval.md)
- [The language server](language-server.md)
- [Registries](../registries/README.md)
