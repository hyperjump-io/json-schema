# Architecture

```text
text ─ rejsonParse ─▶ JSON AST ─ jsonSchemaResolve ─▶ Schema AST ─ (schema validation) ─▶ lower ─▶ kernel ─ optimize ─▶ kernel ─ fast / instrumented ─▶ closures
       (browser)                  (async)                                                  (async)                              (sync, lazy)
```

- `JsonSchema` extends browser's `Hyperjump<JsonSchemaNode>`, and
  `JsonSchemaSession` extends its `Session`. Schemas are retrieved, browsed,
  and compiled in a session (see [Sessions and registries](components/sessions/README.md)).
- Schemas are retrieved with browser's `get`. The schema media type plugin
  (`application/schema+json`, `.schema.json`) runs `rejsonParse` and
  `jsonSchemaResolve`. Any message from either is fatal there: it throws a
  `SchemaError` with all of them (see [Validation API](components/validation-api/README.md)).
- A JSON document (`application/json`, `.json`) is a schema if its
  top-level `$schema` is a dialect the session has or can find
  (`JsonOrSchemaMediaTypePlugin`, which replaces browser's JSON plugin), and
  JSON otherwise. Its `mediaType` is `application/schema+json`, so its
  fragments are a schema's. Before 2026-10-27, only `.schema.json` files
  and `application/schema+json` responses were schemas, and a workspace
  registry gave the CLI its `.json` schemas. Rejected: requiring
  `.schema.json`, which many projects don't use.

## Code map

| Where | What |
| --- | --- |
| `src/json-schema.js` | `JsonSchema`, and the validation API types (`Validator`, …) |
| `src/session.js` | `JsonSchemaSession` |
| `src/keyword.d.ts`, `src/dialect.d.ts`, `src/format.d.ts` | What a keyword, dialect, and format are |
| `src/schema/` | Text to schema AST: the media type plugin, `jsonSchemaResolve`, schema validation, and the schema AST types |
| `src/kernel/` | Schema AST to results: the kernel's expressions (`kernel.d.ts`), `lower` (compiling), the normal form, `optimize`, the evaluators (`fast.js` for plain values without plugins, `instrumented.js` for everything else), `Validator`, instance operations, and evaluation plugin types. See [the kernel spec](specs/kernel/README.md) |
| `src/kernel/optimizations/` | Optimization passes on kernel expressions, one per file. `index.js` lists them in the order they run |
| `src/output/` | Output formats and validation errors |
| `src/registry/` | `SchemaRegistry`, indexing registries, and how a session finds schemas in them |
| `src/dialects/` | The built-in dialects: `v1`, `draft-04` … `draft-2020-12`. Each has the dialect, with the definitions it uses, and its tests, including the test suite runners. `extend-dialect.js` has `extendDialect` |
| `src/keywords/` | Keyword definitions, and `checks.js`, the checks they share for their values |
| `src/formats/` | Format definitions, and the lite and full format lists |
| `src/bundle/` | Bundling, which embeds referenced schemas in one document, and its tests, ported from v1 |
| `src/lint/` | Lint rules (`rules/`, one per file), the recommended preset, `lintRule`, which applies configuration comments, and the utilities rules share |
| `src/validate/` | `jsonSchemaValidate`, the unified plugin that validates JSON files |
| `src/lint/test-linter.js` | The processor lint rule tests use, which resolves like the CLI |
| `test/test-suite.js` | Runs the JSON Schema Test Suite and the annotation test suite |

## Known limitations

- The base URI from a file's path only handles POSIX paths.
