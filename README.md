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
- Errors are plain data, and convert to
  [`VFileMessage`](https://github.com/vfile/vfile-message)s to report them with
  unified tooling
- Schemas from `http(s):`, `file:`, or in-memory registries
- Custom keywords, formats, dialects, vocabularies, output formats, and
  evaluation plugins
- No global state. Everything belongs to a `JsonSchema` instance.

**Status:** Experimental and unpublished. It depends on unreleased versions of
`@hyperjump/browser` (v2) and `@hyperjump/uri`. The API will change. See
[DESIGN.md](DESIGN.md) for the decisions made so far and what's next.

## Install

```bash
npm install @hyperjump/json-schema
```

## Usage

```javascript
import { JsonSchema, SchemaRegistry } from "@hyperjump/json-schema";
import { addV1 } from "@hyperjump/json-schema/v1";

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
//     {
//       source: "json-schema",
//       ruleId: "https://json-schema.org/keyword/minimum",
//       absoluteKeywordLocation: "https://example.com/person#/properties/age/minimum",
//       instanceLocation: "/age",
//       place: undefined
//     },
//     ...
//   ]
// }
```

- BASIC is a flat list of errors.
- DETAILED nests errors by schema structure.

Errors from the built-in output formats are plain data, without messages.
Writing messages that explain errors is left to other output formats. Add your
own with `addOutputFormat`.

To report errors with unified tooling, `toVFileMessage` converts an error to a
`VFileMessage` with a generic message, and `outputErrorMessage` gives just the
message.

```javascript
import { outputErrorMessage, toVFileMessage } from "@hyperjump/json-schema";

outputErrorMessage(result.errors[0]);
// "'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'"

toVFileMessage(result.errors[0]); // A VFileMessage with that message
```

### JSON text

`validateJson` parses JSON text and validates it. The parse is error-tolerant,
so syntax errors are reported along with validation errors, and every error has
a position.

```javascript
const result = validator.validateJson(`{ "name": "Jason", "age": -1, }`, { output: "BASIC" });

result.errors.map((error) => String(toVFileMessage(error)));
// [
//   "1:27-1:29: Fails the constraint at 'https://example.com/person#/properties/age/minimum'",
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

- **Files and HTTP:** `file:` and `http(s):` URIs are retrieved, if
  `allowRetrieval` allows them (see below). Only `application/schema+json`
  responses and `.schema.json` files are schemas. A plain `.json` file isn't.
  Relative references work as you'd expect.

  ```javascript
  import { pathToFileURL } from "node:url";

  const uri = pathToFileURL("./person.schema.json").href;
  const validator = await jsonSchema.compile(uri);
  ```

Schemas aren't trusted, so a schema can't make your application retrieve
whatever it names, like an internal address or a file outside your project.
Only what the `allowRetrieval` config allows is retrieved. By default, that's
what's local to your application. In Node.js, that's files in the working
directory, and not `http(s):`. In a browser, it's `http(s):` URLs with the
page's origin. Anything else is a `RetrievalNotAllowedError`. Registries are
never checked.

```javascript
const jsonSchema = new JsonSchema({
  allowRetrieval: (url) => url.origin === "https://schemas.example.com"
});
```

A session can have its own predicate, which it uses instead, for when
different parts of your application can retrieve different things.

```javascript
const session = jsonSchema.session({ allowRetrieval: (url) => url.protocol === "file:" });
```

The predicate gets a `URL`. In Node.js, a `file:` URL is the file's real path,
so a symlink can't lead outside a directory you allow. A response is checked
again by the URL it came from, so a redirect can't lead somewhere you didn't
allow. The redirected request is still sent, though. Its response just isn't
used. Use `() => false` to allow nothing but registries.

To send headers with `http(s):` requests, such as credentials, replace the
`http(s):` plugin with one that has a `headers` option. It's called with
each URL that's requested, so only send credentials to the origins they're
for. A schema can name any URL. It can be async, so you can refresh a token.
Replacing the plugin replaces its cache too, so give it one.

```javascript
import { HttpUriSchemePlugin, MemoryHttpCacheStore } from "@hyperjump/browser";

jsonSchema.addUriSchemePlugin(new HttpUriSchemePlugin(jsonSchema, {
  cache: new MemoryHttpCacheStore(),
  headers: (url) => url.origin === "https://schemas.example.com"
    ? { Authorization: `Bearer ${process.env.SCHEMAS_TOKEN}` }
    : undefined
}));
```

### Dialects

A `JsonSchema` starts without any dialects. Add the ones you need from their
modules. Presets don't depend on each other, so add only what you use.

```javascript
import { addDraft202012 } from "@hyperjump/json-schema/draft-2020-12";
import { addDraft07 } from "@hyperjump/json-schema/draft-07";

addDraft202012(jsonSchema);
addDraft07(jsonSchema);
```

| Module | Add with | Dialect URI |
| --- | --- | --- |
| `@hyperjump/json-schema/v1` | `addV1` | `https://json-schema.org/v1` |
| `@hyperjump/json-schema/draft-2020-12` | `addDraft202012` | `https://json-schema.org/draft/2020-12/schema` |
| `@hyperjump/json-schema/draft-2019-09` | `addDraft201909` | `https://json-schema.org/draft/2019-09/schema` |
| `@hyperjump/json-schema/draft-07` | `addDraft07` | `http://json-schema.org/draft-07/schema` |
| `@hyperjump/json-schema/draft-06` | `addDraft06` | `http://json-schema.org/draft-06/schema` |
| `@hyperjump/json-schema/draft-04` | `addDraft04` | `http://json-schema.org/draft-04/schema` |

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
import { addFullFormats } from "@hyperjump/json-schema/formats/full";

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

The `hyperjump` CLI reports every problem in a schema without compiling it:
syntax errors, a missing dialect, unknown keywords, invalid keyword values.
It's built on [`unified-args`](https://github.com/unifiedjs/unified-args), so
it has the same options as other unified CLIs. It knows every dialect this
package has.

```bash
npx hyperjump schemas/
```

It's also installed as `hjlint`. `npx hyperjump` and `npx hjlint` use the CLI
installed in your project. Without it, npx would download an unrelated package
named `hyperjump`, so use `npx -p @hyperjump/json-schema hyperjump` to run
it without installing.

A JSON file is linted if it's a `.schema.json` file or its `$schema` is a
dialect: one of the dialects this package has, or one defined by a meta-schema
it can find. Other JSON files are validated against their schemas (see
"Validating JSON files"). Schema problems are errors, so an
invalid schema fails the command. Use `-q` to only see files with problems.

It reads from stdin if no files are given, as if it were a file in the working
directory. Use `--file-path` to give it a name. It doesn't write schemas back out unless you ask with
`--stdout` or `--output`.

Every schema in the working directory can be found by its `$id` or its path, including custom meta-schemas, whether or not it's linted. Only
the files you give it are linted. So a vendored meta-schema can be ignored
with `.hyperjumpignore` and still be found. `node_modules`, `.git`, and
symlinks aren't searched. URLs are only retrieved if the `allowRetrieval` setting
allows them. It's a list of `http:` or `https:` URLs. One that ends with `/`
allows everything under it, and any other allows only itself.

```json
{
  "settings": {
    "allowRetrieval": ["https://schemas.example.com/"]
  }
}
```

Files outside the working directory can't be allowed this way. A
configuration file can't name a path outside your project that works for
everyone. To use one, give it to the CLI, and it's found by its `$id` or its
path.

Lint rules find things that are likely mistakes in a schema that still works,
such as `then` without `if`. They're off unless you turn them on in a
`.hyperjumprc` file (or a `hyperjumpConfig` field in `package.json`). The
recommended preset turns on every rule that's likely a mistake. They're
warnings, except for ones that find a schema that can't be compiled, like a
`$ref` that doesn't find a schema, which are errors. Rules after it change
their settings. A rule's setting is an array, with its
severity (`"off"`, `"warn"`, or `"error"`) first.

```json
{
  "plugins": [
    "@hyperjump/json-schema/lint/recommended",
    ["@hyperjump/json-schema/lint/rules/then-else-without-if", ["error"]]
  ]
}
```

Warnings don't fail the command unless you use `--frail`.

| Rule | Reports |
| --- | --- |
| `then-else-without-if` | `then` or `else` without `if` |
| `if-without-then-else` | `if` without `then` or `else` |
| `duplicate-enum-values` | A value in `enum` that's equal to one before it |
| `empty-enum` | An `enum` with no values, which nothing is valid against |
| `empty-type` | A `type` that's an empty array, which nothing is valid against |
| `duplicate-one-of-schemas` | A schema in `oneOf` that's equal to one before it, so a value it matches always fails |
| `read-only-and-write-only` | `readOnly` and `writeOnly` both `true` in the same schema |
| `min-max-contains-without-contains` | `minContains` or `maxContains` without `contains` |
| `reference-without-target` | A `$ref` that doesn't find a schema, such as a file that doesn't exist or a JSON Pointer that doesn't point to anything |

A `$comment` that starts with `jsonschema-lint-disable` turns rules off for the
schema it's in and its subschemas, and `jsonschema-lint-enable` turns them back
on. Name the rules after it, or name none for every rule. The innermost schema
with a directive for a rule decides. It works in every dialect, including
draft-04 and draft-06, which don't have `$comment`. Schema problems can't be
turned off.

```json
{
  "$schema": "https://json-schema.org/v1",
  "$comment": "jsonschema-lint-disable then-else-without-if",
  "then": true,
  "properties": {
    "foo": { "$comment": "jsonschema-lint-enable then-else-without-if", "then": true }
  }
}
```

A directive that names a rule that isn't configured is a warning
(`unknown-rule`), and so is a misspelled directive (`unknown-directive`).

### Validating JSON files

The `hyperjump` CLI also validates JSON files that aren't schemas. A file's
schema is the last pattern in the `schemas` setting that matches its path, or
else its own top-level `$schema`, relative to the file. Patterns and schema
paths are relative to the working directory, and a schema can also be a URI.
A JSON file without a schema only has its syntax checked.

```json
{
  "settings": {
    "schemas": {
      "config/*.json": "schemas/config.schema.json",
      "data/**/*.json": "https://example.com/person"
    }
  }
}
```

```bash
npx hyperjump config/ data/
npx hyperjump --setting 'schemas:{"*.json":"person.schema.json"}' alice.json
cat alice.json | npx hyperjump --file-path alice.json
```

Schemas are found the same way they are for linting: every schema in the
working directory, by its `$id` or its path, and the URLs
`allowRetrieval` allows. Validation errors and a schema that can't be used are
errors. Syntax errors are reported too, and the rest of the file is still
validated.

The CLI's processor isn't exported, but the plugin that validates is. It
takes a compiled schema, so you decide where schemas come from.

```js
import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { jsonSchemaValidate } from "@hyperjump/json-schema";

const validator = await jsonSchema.compile("https://example.com/person");
const file = await unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaValidate, { validator })
  .use(rejsonStringify)
  .process(json);
file.messages; // Syntax errors and validation errors, with positions
```

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
import { v1DialectUri } from "@hyperjump/json-schema/v1";

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

A lint rule is a unified plugin made with `lintRule` from
`@hyperjump/json-schema/lint`. It's
[`unified-lint-rule`](https://github.com/remarkjs/remark-lint/tree/main/packages/unified-lint-rule)'s
`lintRule`, and it also applies `$comment` directives to the rule's messages.
A rule runs on a schema AST, after every schema and keyword has been
identified. Find keywords by keyword URI, not by name, so the rule works in
every dialect with the keyword. The same module has utilities to find schemas
and keywords.

```javascript
import { lintRule, siblingKeyword, visitKeywords } from "@hyperjump/json-schema/lint";

export default lintRule({ origin: "jsonschema-lint-example:min-without-max" }, (tree, file) => {
  visitKeywords(tree, "https://json-schema.org/keyword/minimum", (keywordNode, schemaNode) => {
    if (siblingKeyword(schemaNode, "https://json-schema.org/keyword/maximum") === undefined) {
      file.message("'minimum' without 'maximum'", { place: keywordNode.position });
    }
  });
});
```

A rule that needs another schema, such as the target of a reference, uses
`findSchema` with the session the schema was resolved in
(`file.data.jsonSchemaSession`), so it only sees what your application's
registries and `allowRetrieval` allow. Pass the tree as `document`, so
references into the schema being linted find what's in it. It says whether
the schema is `found`, `missing`, or `unknown`. Report `missing` only.
`unknown` means it can't be told, such as for a URL `allowRetrieval`
refuses. `visitReferences` finds every `$ref` in every dialect, with the URI
it refers to.

```javascript
import { findSchema, visitReferences } from "@hyperjump/json-schema/lint";

const references = [];
visitReferences(tree, (uri, node) => references.push([uri, node]));
for (const [uri, node] of references) {
  const result = await findSchema(file.data.jsonSchemaSession, uri, { document: tree });
  if (result.status === "missing") {
    file.message(result.reason.message, { place: node.position });
  }
}
```

A package named `hyperjump-<name>` can be used in `.hyperjumprc` as
`<name>`. See `src/lint/` for the built-in rules.

### Evaluation plugins

Plugins observe an evaluation. They have `beforeSchema`, `afterSchema`,
`beforeKeyword`, `afterKeyword`, and `annotation` hooks. With any plugin, the
instance is evaluated once and nothing stops early, so it's slower.

`annotation` gets every annotation, even from schemas that fail, so a tool
like a language server can show a `description` in an invalid document.

```javascript
const descriptions = new Map();
validator.validateJson(json, {
  plugins: [{
    annotation(keyword, at, value) {
      if (keyword.keywordUri === "https://json-schema.org/keyword/description") {
        descriptions.set(at.instanceLocation, value);
      }
    }
  }]
});
```

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
