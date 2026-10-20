# Hyperjump - JSON Schema Next

A JSON Schema validator built on
[`@hyperjump/browser`](https://github.com/hyperjump-io/browser) and
[unified](https://unifiedjs.com/). It's a rewrite of
[`@hyperjump/json-schema`](https://github.com/hyperjump-io/json-schema).

- Dialects: v1, draft-2020-12, draft-2019-09, draft-07, draft-06, draft-04
- Get a boolean, errors, or annotations, for a plain JS value, JSON text, or
  a JSON AST. See [Modes](#modes).
- With JSON text, every error has a position, and syntax errors are reported
  with validation errors
- Annotations come back as an AST with annotations on its nodes
- Errors are [`VFileMessage`](https://github.com/vfile/vfile-message)s, so
  they work with unified tooling
- Schemas from `http(s):`, `file:`, or in-memory registries
- Custom keywords, formats, dialects, vocabularies, output formats, and
  evaluation plugins
- No global state. Everything belongs to a `JsonSchema` instance.

**Status:** Experimental and unpublished. It depends on unreleased versions of
`@hyperjump/browser` (v2) and `@hyperjump/uri`. The API will change. See
[DESIGN.md](DESIGN.md) for the decisions made so far and what's next.

## Install

```bash
npm install @hyperjump/json-schema-next
```

## Usage

```javascript
import { JsonSchema, SchemaRegistry } from "@hyperjump/json-schema-next";
import { addV1 } from "@hyperjump/json-schema-next/v1";

const jsonSchema = new JsonSchema();
addV1(jsonSchema);

jsonSchema.addRegistry(new SchemaRegistry().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  title: "Person",
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 0 }
  },
  required: ["name"]
}));

const validator = await jsonSchema.compile("https://example.com/person");

validator.validate({ name: "Jason", age: 42 }); // true
validator.validate({ age: -1 }); // false
```

A `Validator` can be used for any number of instances. `jsonSchema.validate(uri,
instance)` is a shortcut, but it compiles the schema every time.

### Modes

A validator works in three modes, on three kinds of instance.

| | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| **Flag** | `validate(value)` | `validateJson(text)` | `validateNode(node)` |
| **Errors** | `validate(value, { output })` | `validateJson(text, { output })` | `validateNode(node, { output })` |
| **Annotations** | `annotate(value)` | `annotateJson(text)` | `annotateNode(node)` |

- **Flag** is just a boolean. It's the default, and the fastest.
- **Errors** says why an instance is invalid. Use the BASIC or DETAILED
  output format.
- **Annotations** validates and returns the instance as an AST with
  annotations on its nodes. It takes an `output` option too.
- **JSON text** is parsed error-tolerantly. Syntax errors are reported with
  validation errors, and every error has a position.
- **JSON AST** is a node you already have, such as a value in a schema AST.

### Output

The default output is FLAG: just a boolean, which is the fastest. Use BASIC or
DETAILED to find out why an instance is invalid.

```javascript
const result = validator.validate({ age: -1 }, { output: "BASIC" });
// {
//   valid: false,
//   errors: [
//     ValidationError {
//       reason: "Expected the instance to pass 'minimum'",
//       ruleId: "https://json-schema.org/keyword/minimum",
//       instanceLocation: "/age",
//       keywordLocation: "/properties/age/minimum",
//       absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//       ...
//     },
//     ...
//   ]
// }
```

- BASIC is a flat list of errors.
- DETAILED nests errors by schema structure.

The built-in output formats give errors a generic `reason` that names the
keyword. Writing messages that explain the error is left to other output
formats. Add your own with `addOutputFormat`.

### JSON text

`validateJson` parses JSON text and validates it. The parse is error-tolerant,
so syntax errors are reported along with validation errors, and every error has
a position.

```javascript
const result = validator.validateJson(`{ "name": "Jason", "age": -1, }`, { output: "BASIC" });

result.errors.map(String);
// [
//   "1:27-1:29: Expected the instance to pass 'minimum'",
//   "1:29-1:30: Trailing commas are not allowed"
// ]
```

`validateNode` validates a JSON AST node, such as a value in a schema AST.

### Annotations

`annotate` validates and returns the instance as a JSON AST
([unist](https://github.com/syntax-tree/unist)) with annotations attached to its
nodes. `annotateJson` does the same for JSON text. `annotateNode` attaches
annotations to a JSON AST node you pass it and returns only the output.
Annotations are a `Map` of keyword URI to the values collected for that node.

```javascript
const { output, node } = validator.annotate({ name: "Jason" });

node.data.annotations;
// Map { "https://json-schema.org/keyword/title" => ["Person"] }
```

Annotations follow the spec. They're only kept for the parts of the schema the
instance passed.

### Where schemas come from

A schema is looked up in registries first, then retrieved by its URI.

- **Registries:** A `SchemaRegistry` holds schemas that aren't retrieved. A
  schema is identified by its `$id`, or by `retrievalUri` if it doesn't have
  one. A registry never changes. `with` and `without` return a new one.

  ```javascript
  const registry = new SchemaRegistry()
    .with(schema)
    .with(schemaText, { retrievalUri: "https://example.com/other" });
  ```

  Add a registry to the `JsonSchema` with `addRegistry`, or use one for a
  single compilation with `compile(uri, { registries: [registry] })`.

- **Files and HTTP:** `file:` and `http(s):` URIs are retrieved. Only
  `application/schema+json` responses and `.schema.json` files are schemas. A
  plain `.json` file isn't. Relative references work as you'd expect.

  ```javascript
  import { pathToFileURL } from "node:url";

  const uri = pathToFileURL("./person.schema.json").href;
  const validator = await jsonSchema.compile(uri);
  ```

### Dialects

A `JsonSchema` starts without any dialects. Add the ones you need from their
modules. Presets don't depend on each other, so add only what you use.

```javascript
import { addDraft202012 } from "@hyperjump/json-schema-next/draft-2020-12";
import { addDraft07 } from "@hyperjump/json-schema-next/draft-07";

addDraft202012(jsonSchema);
addDraft07(jsonSchema);
```

| Module | Add with | Dialect URI |
| --- | --- | --- |
| `@hyperjump/json-schema-next/v1` | `addV1` | `https://json-schema.org/v1` |
| `@hyperjump/json-schema-next/draft-2020-12` | `addDraft202012` | `https://json-schema.org/draft/2020-12/schema` |
| `@hyperjump/json-schema-next/draft-2019-09` | `addDraft201909` | `https://json-schema.org/draft/2019-09/schema` |
| `@hyperjump/json-schema-next/draft-07` | `addDraft07` | `http://json-schema.org/draft-07/schema` |
| `@hyperjump/json-schema-next/draft-06` | `addDraft06` | `http://json-schema.org/draft-06/schema` |
| `@hyperjump/json-schema-next/draft-04` | `addDraft04` | `http://json-schema.org/draft-04/schema` |

A schema's dialect comes from `$schema`. There's no default. A schema without
one is an error unless it's embedded in a schema that has one, or you set one.

```javascript
const jsonSchema = new JsonSchema({ defaultDialectUri: "https://json-schema.org/v1" });
```

Custom meta-schemas that use `$vocabulary` (2019-09 and 2020-12) define their
own dialects. Use `addVocabulary` from either of those modules to add
vocabularies they can use.

Unknown keywords are errors in v1, except ones that start with `x-`, which
are annotations. They're annotations in 2019-09 and 2020-12, and ignored in
draft-04 through draft-07.

### Formats

`format` validates by default in v1 and draft-04 through draft-07. It's only an
annotation in 2019-09 and 2020-12. The `validateFormats` config overrides the
dialect.

```javascript
const jsonSchema = new JsonSchema({ validateFormats: true });
```

Each preset adds the formats its dialect defines, except `hostname`,
`idn-hostname`, and `idn-email`. Those need large tables of Unicode data, so
they're only loaded if you ask for them. (draft-04 and draft-06 have their own
`hostname`, which doesn't.)

```javascript
import { addFullFormats } from "@hyperjump/json-schema-next/formats/full";

addFullFormats(jsonSchema);
```

### Invalid schemas

Schemas are always validated before they're used. A schema that isn't valid
can't be retrieved, so `compile` throws a `RetrievalError` from
`@hyperjump/browser`. Its `cause` is the problem, as a `VFileMessage` with a
position if the schema was JSON text.

```javascript
jsonSchema.addRegistry(new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/bad",
  "minLength": -1
}`));

try {
  await jsonSchema.compile("https://example.com/bad");
} catch (error) {
  String(error.cause); // "4:16-4:18: Expected a non-negative integer"
}
```

### Linting schemas

The `jsonschema` CLI reports every problem in a schema without compiling it:
syntax errors, a missing dialect, unknown keywords, invalid keyword values.
It's built on [`unified-args`](https://github.com/unifiedjs/unified-args), so
it has the same options as other unified CLIs. It knows every dialect this
package has.

```bash
npx jsonschema schemas/
```

Only `.schema.json` files are linted. To lint a plain JSON file, include it with
an ignore pattern, such as `--ignore-pattern '!schema.json'`. Schema problems
are errors, so an invalid schema fails the command. Use `-q` to only see files
with problems.

It reads a schema from stdin if no files are given, as if it were a file in the
working directory. It doesn't write schemas back out unless you ask with
`--stdout` or `--output`.

Lint rules find things that are likely mistakes in a schema that still works,
such as `then` without `if`. They're off unless you turn them on in a
`.jsonschemarc` file (or a `jsonSchemaConfig` field in `package.json`). The
recommended preset turns on every rule that's likely a mistake, as warnings.
Rules after it change their settings. A rule's setting is an array, with its
severity (`"off"`, `"warn"`, or `"error"`) first.

```json
{
  "plugins": [
    "@hyperjump/json-schema-next/lint/recommended",
    ["@hyperjump/json-schema-next/lint/rules/then-else-without-if", ["error"]]
  ]
}
```

Warnings don't fail the command unless you use `--frail`.

| Rule | Reports |
| --- | --- |
| `then-else-without-if` | `then` or `else` without `if` |
| `min-max-contains-without-contains` | `minContains` or `maxContains` without `contains` |
| `exclusive-without-maximum-minimum` | draft-04's `exclusiveMaximum` or `exclusiveMinimum` without `maximum` or `minimum` |

### Serializing compiled schemas

A compiled schema is JSON, so it can be cached and restored without retrieving
or compiling anything. The same keywords must have been added.

```javascript
const compiled = validator.serialize();
const restored = jsonSchema.restoreValidator(compiled);
```

## Extending

The `.d.ts` files in `src/` are hand-written and have JSDoc for every part of
the API. Run `npm run docs` to generate the API docs.

### Custom keywords

A keyword is a plain object identified by a URI. Add it with `addKeyword`, then
give it a name in a dialect. In v1, that's `extendDialect`.

```javascript
import { v1DialectUri } from "@hyperjump/json-schema-next/v1";

jsonSchema.addKeyword({
  uri: "https://example.com/keyword/even",
  shape: "data", // Where the keyword's value contains schemas
  check(valueNode, { message }) { // Reports problems with the keyword's value
    if (valueNode.jsonType !== "boolean") {
      message("Expected a boolean");
    }
  },
  evaluate(even, { instance }) {
    if (!even) {
      return undefined; // Every instance passes
    }

    return (node) => instance.typeOf(node) !== "number" || instance.value(node) % 2 === 0;
  }
});

jsonSchema.extendDialect(v1DialectUri, {
  keywords: { even: "https://example.com/keyword/even" }
});
```

`evaluate` is called once each time a validator is specialized, not for every
instance, so do any work that doesn't depend on the instance there. Keywords
look at instances through `context.instance`, so the same code works for plain
values and ASTs. Keywords with subschemas use `compile` to compile them. See
`src/keyword.d.ts` and the built-in keywords in `src/keywords/`.

### Custom formats

```javascript
jsonSchema.addFormat({
  uri: "https://example.com/format/hex",
  validate: (value) => typeof value !== "string" || /^[0-9a-f]+$/i.test(value)
});

jsonSchema.extendDialect(v1DialectUri, {
  formats: { hex: "https://example.com/format/hex" }
});
```

### Custom dialects

Use `addDialect` for a dialect whose meta-schema doesn't define it. A dialect
maps keyword names to keyword URIs and says what unknown keywords mean.

```javascript
jsonSchema.addDialect({
  uri: "https://example.com/dialect",
  keywords: {
    type: "https://json-schema.org/keyword/type",
    even: "https://example.com/keyword/even"
  },
  unknownKeywords: "error"
});
```

### Lint rules

A lint rule is a unified plugin made with
[`unified-lint-rule`](https://github.com/remarkjs/remark-lint/tree/main/packages/unified-lint-rule).
It runs on a schema AST, after every schema and keyword has been identified.
Find keywords by keyword URI, not by name, so the rule works in every dialect
with the keyword. The utilities in `@hyperjump/json-schema-next/lint` find
schemas and keywords.

```javascript
import { lintRule } from "unified-lint-rule";
import { siblingKeyword, visitKeywords } from "@hyperjump/json-schema-next/lint";

export default lintRule({ origin: "jsonschema-lint-example:min-without-max" }, (tree, file) => {
  visitKeywords(tree, "https://json-schema.org/keyword/minimum", (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, "https://json-schema.org/keyword/maximum") === undefined) {
      file.message("'minimum' without 'maximum'", { place: keywordNode.position });
    }
  });
});
```

A package named `jsonschema-<name>` can be used in `.jsonschemarc` as
`<name>`. See `src/lint/` for the built-in rules.

### Evaluation plugins

Plugins observe an evaluation. They have `beforeSchema`, `afterSchema`,
`beforeKeyword`, and `afterKeyword` hooks. With any plugin, the instance is
evaluated once and nothing stops early, so it's slower.

```javascript
const keywords = new Set();
validator.validate(instance, {
  plugins: [{
    afterKeyword(keyword) {
      keywords.add(keyword.absoluteKeywordLocation);
    }
  }]
});
```

### Sessions

A session retrieves, browses, and compiles schemas. Everything it resolves
belongs to it, and it goes away with the session. `compile` creates a session
for each compilation. Create one yourself to browse schemas with
`@hyperjump/browser`'s API or to compile several schemas with the same
documents.

```javascript
const session = jsonSchema.session({ registries: [registry] });
const node = await session.get("https://example.com/person#/properties/name");
const validator = await session.compile("https://example.com/person");
```

## Contributing

`@hyperjump/browser` and `@hyperjump/uri` are linked from sibling directories
(`../browser` on its `v2` branch and `../uri`).

### Tests

Run the tests

```bash
npm test
```

Run the tests with a continuous test runner

```bash
npm test -- --watch
```

Lint and type-check

```bash
npm run lint
npm run type-check
```
