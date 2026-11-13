# Architecture

```text
text ─ fromJson ─▶ JSON AST ─ resolveSchema ─▶ Schema AST ─ (schema validation) ─▶ lower ─▶ kernel ─ optimize ─▶ kernel ─ fast / instrumented ─▶ closures
       (browser)                  (async)                                                  (async)                              (sync, lazy)
```

- A `JsonSchema` has the definitions, the config, and the stack schemas
  are retrieved through. Its session is a value around browser's session,
  a `Hyperjump`, that browser's functions take. Schemas are retrieved,
  browsed, and compiled in a session (see [Sessions and registries](components/sessions/README.md)).
- Schemas are retrieved with browser's `get`. The schema media type plugin
  (`application/schema+json`, `.schema.json`) parses with `fromJson` and
  resolves with `resolveSchema` (`jsonSchemaResolve` is the same as a
  unified plugin). Any problem from either is fatal there: it throws a
  `SchemaError` with all of them (see [Validation API](components/validation-api/README.md)).
- A JSON document (`application/json`, `.json`) is a schema if its
  top-level `$schema` is a dialect the session has or can find
  (`jsonOrSchemaMediaType`, which comes before browser's JSON plugin), and
  JSON otherwise. The plugin's `fragmentPointer` reads a schema's
  fragments as a schema's. Before 2026-10-27, only `.schema.json` files
  and `application/schema+json` responses were schemas, and a workspace
  registry gave the CLI its `.json` schemas. Rejected: requiring
  `.schema.json`, which many projects don't use.

## Code map

| Where | What |
| --- | --- |
| `src/json-schema.js` | `JsonSchema`: definitions, the instance's registry, sessions |
| `src/operations/` | The operations: `validate`, `validator`, `annotate`, `annotator`, `compile`, `serialize`, `restore`, `bundle`, `lint`, and what they share (`context.js`, `evaluators.js`). `validatorFor` and `annotatorFor` are in `validate-compiled.js`, apart from the others, because they import the instrumented evaluator |
| `src/session.js` | Sessions: creating one, what one keeps for schemas, `getDialect`, and `annotation` |
| `src/keyword.d.ts`, `src/dialect.d.ts`, `src/format.d.ts` | What a keyword, dialect, and format are |
| `src/schema/` | Text to schema AST: the media type plugin, `resolveSchema` and `jsonSchemaResolve`, schema validation, and the schema AST types |
| `src/kernel/` | Schema AST to results: the kernel's expressions (`kernel.d.ts`), `lower` (compiling), the normal form, `optimize`, the definitions a kernel uses (`definitions.js`), the evaluators (`fast.js` for plain values without plugins, `instrumented.js` for everything else), `Validator`, instance operations, and evaluation plugin types. See [the kernel spec](specs/kernel/README.md) |
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
