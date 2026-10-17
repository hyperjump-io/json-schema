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

- `JsonSchema` extends browser's `Hyperjump<JsonSchemaNode>`, so the same
  object browses and validates schemas.
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
- Anchors and dynamic anchors are recorded per resource as JSON Pointers.
  2019-09's `$recursiveAnchor: true` is a dynamic anchor named `""`.

## Keywords (`src/keyword.d.ts`)

Keywords are plain, stateless objects so one definition can be shared by
every `JsonSchema` instance and every dialect. Anything instance-specific
should come through a context argument. (Classes with constructor injection
were considered. See "Open questions".)

- `uri`: Identifies the keyword independent of its name in any dialect.
- `shape`: Where the value contains schemas, using combinators: `"schema"`,
  `"data"`, `{ array: Shape }`, `{ map: Shape }`, or `Shape[]` (the first
  alternative whose JSON type matches). A value that doesn't match is data.
- `valueSchema`: The URI of a schema for the keyword's own value, used for
  schema validation. It's required, even for a keyword that allows any
  value. It doesn't describe subschemas; those are validated as schemas. It
  declares its dialect with `$schema` (see "Schema validation").
- `resolve`: An optional hook for keywords that identify schemas (`$id`,
  `$anchor`, `$dynamicAnchor`, legacy `id`/`$id`/`$ref`, `$recursiveAnchor`).
  It records effects (`setBaseUri`, `addAnchor`, `addDynamicAnchor`,
  `setReference`) that are applied after every keyword in the schema has been
  seen, so keyword order doesn't matter. `setReference` makes the schema a
  reference node and discards everything else in it, including messages.
- Draft-specific identifier rules live in keyword definitions, not the core.
- `$schema` and unknown keywords are part of every dialect. The resolver maps
  `$schema` by name, and any other name the dialect doesn't define is
  unknown. Both definitions are added to every `JsonSchema` by default and are
  ordinary keywords otherwise. The unknown keyword can be replaced.

## Dialects (`src/dialect.d.ts`)

- A dialect is `{ uri, keywords, unknownKeywords }`. `keywords` maps names to
  keyword URIs. `unknownKeywords` is `"error"` (v1), `"annotation"` (2019-09,
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
  annotation, so any name is fine.
- The lite formats (`src/formats/lite.js`) are every format JSON Schema
  defines except `hostname`, `idn-hostname`, and `idn-email`, which need large
  tables of Unicode data. Every `JsonSchema` has them, and v1 validates
  formats by default. `src/formats/full.js` adds the rest. The validators come
  from `@hyperjump/json-schema-formats`.
- Keyword names starting with `x-` are reserved for schema authors in every
  dialect. They're guaranteed to never collide with a keyword, so they must
  never assert. Registering one throws (`addVocabulary`, `addDialect`,
  `extendDialect`). They're always allowed in schemas, even when unknown
  keywords are errors, and then they're annotations (v1).
- `$vocabulary` was removed in v1 but is still supported for 2019-09 and
  2020-12. A dialect that isn't defined is built from its meta-schema's
  `$vocabulary`. The meta-schema is retrieved with `get` and must be a schema.
  A self-describing meta-schema (its `$schema` is the URI it was retrieved
  from) defines its dialect while it's resolved. Meta-schemas that depend on
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
- Each keyword's `valueSchema` validates its value.
  `jsonSchemaValidateKeywords` is a unified plugin that runs after
  `jsonSchemaResolve`. The schema media
  type plugin runs it unless the `validateSchemas` config is `false`. It
  validates each keyword's value node with `Validator.validateNode`. An
  invalid value gets one message, placed on the value, with the keyword's URI
  as the `ruleId` and the value schema's BASIC errors as its `cause` (an
  `AggregateError`).
- A keyword's `valueSchema` is a URI, and the value schema is retrieved
  like any other schema. The built-in keywords' value schemas are
  `.schema.json` files next to the keywords, and their URIs are computed
  with `import.meta.url`, so they're `file:` URIs in Node. Being files lets
  tooling like a language server or a CI check validate them, since they
  aren't validated themselves. Every keyword has one, even if it allows any
  value.
- Value schemas declare their dialect with `$schema`. They're written in v1,
  so every `JsonSchema` has the v1 dialect, keywords, and lite formats, like
  it has `$schema` and the unknown keyword. Value schemas aren't validated
  themselves, because validating one would need itself.
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
  keyword. Compiling any schema in a resource also compiles that resource's
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
JSON-Schema-Test-Suite, and over the ones that are also 2020-12 test cases,
without the test cases tagged for `format`. A test case that any
implementation gets wrong is left out for every implementation.

Results (mean time per run of the suite, FLAG unless it says errors):

| | json-schema-next | `@hyperjump/json-schema` |
| --- | --- | --- |
| v1 | 0.26–0.28 ms | 0.75 ms |
| v1, after evaluating ASTs | 0.31–0.33 ms | 0.75 ms |
| v1, all errors | 1.52–1.54 ms | 1.35–1.36 ms |

- FLAG is about 2.7–2.9 times faster than `@hyperjump/json-schema`.
- `validate` is about 15% slower in a process that has also evaluated
  ASTs, because keyword code is shared (see "Compile and evaluate").
- Collecting errors (BASIC) is about 1.13 times slower than
  `@hyperjump/json-schema`. It was about 5 times slower until errors
  stopped capturing stack traces (see "Validation API").
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
  `$anchor`, `$dynamicAnchor`, draft-04 `id`/`$ref`, and 2019-09
  `$recursiveAnchor`. Other keywords only need shapes and value schemas, so
  they'll be added with the compile side.
- The v1 dialect (`src/v1`) is built into every `JsonSchema`. It used to be
  added with `addV1`. The JSON-Schema-Test-Suite (its `unify`
  branch, which will replace `main`) runs in
  `src/v1/json-schema-test-suite.test.js`. v1 is the suite's `9999`. Each
  test case gets its own `JsonSchema` with an in-memory `http(s):` URI scheme
  plugin for its schema and `externalSchemas`. Each test is checked with
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

Changes made to browser for this (on its `v2` branch):

- A type parameter for property node annotations, and JSON AST utilities that
  are generic over the node type.
- A generic `DocumentNode<T>`.
- Embedded documents can be found from any document in the same compound
  document.
- A file's media type uses the longest matching extension.
- `content-type` v3, with the parsed type validated.
- `retrieve` is declared as a method so `JsonSchema` can override it.
- `getDocument` gets the document a URI identifies, for what it has beyond
  its values. Compiling uses it for a resource's dynamic anchors.
- `jsonValue` supports arrays and objects. `Hyperjump.value` still doesn't,
  because it would need to follow references.
- Node locations are valid IRIs. Each pointer segment is percent-encoded
  with `appendToLocation` (`@hyperjump/uri`'s new `encodeIriFragment`),
  which produces normalized IRIs, and `get` decodes a fragment before
  following it as a JSON Pointer. The resolver and compiler build locations
  the same way. Keyword and instance locations in output are JSON Pointers,
  so they aren't encoded.

## Plan

1. Implement the v1 keywords (shapes, value schemas, compile, and evaluate)
   and a v1 preset. Run the JSON-Schema-Test-Suite. Benchmark whether sharing
   keyword code between plain values and ASTs slows down `validate`. Done.
2. Schema validation with value schemas. Done.
3. Presets for 2020-12, 2019-09, and draft-04 through draft-07. Move the
   `$vocabulary` support into the 2019-09 and 2020-12 presets as a hook the
   core doesn't need.
4. A registry for schemas that aren't retrieved by URI (deferred; schemas come
   from `file:` and `http(s):` for now). Then fix the built-in value schemas
   in browsers (see "Known limitations").
5. Later: annotations, bundling, OpenAPI, a CLI, a unified plugin for
   validating JSON files, and migrating dependent projects.

## Known limitations

- `@hyperjump/browser` v2 isn't published, so it's a `file:../browser`
  dependency. `@hyperjump/uri` is `file:../uri` until `encodeIriFragment` is
  published.
- The base URI from a file's path only handles POSIX paths.
- The `JsonSchema` shortcuts (`validate(uri, ...)` and the others) compile the
  schema every time.
- In a browser, the built-in value schemas' URIs are `http(s):` URLs next
  to the modules. Servers usually serve `.schema.json` as `application/json`,
  which isn't a schema, so schema validation fails unless `validateSchemas`
  is `false`. Bundlers that copy `new URL(..., import.meta.url)` assets have
  the same problem. Browser support is required, so this has to be fixed
  once there's a registry.
- A self-describing meta-schema is recognized by the URI it was retrieved
  from. A copy retrieved from a different URI than its `$id` isn't recognized,
  and that's reported as an error.
