# Getting started

This tutorial takes you from installing the library to validating data,
explaining what's wrong with invalid data, loading schemas from files, and
linting them. Each step builds on the one before it.

## Install

```bash
npm install @hyperjump/json-schema
```

It's an ES module, with TypeScript types. It works in Node.js and in
browsers. In a browser, use a bundler that supports the `imports` field of
`package.json`, like Vite, webpack, esbuild, or Rollup.

## Create a `JsonSchema`

A `JsonSchema` holds everything your application's schemas need: the
dialects (versions of JSON Schema) it supports, the schemas it knows about,
and its configuration. Most applications create one and use it everywhere.

It starts without any dialects, so add the ones your schemas use. This
tutorial uses JSON Schema v1. [Dialects](guides/dialects.md) lists the
others.

```javascript
import { JsonSchema } from "@hyperjump/json-schema";
import { addV1 } from "@hyperjump/json-schema/v1";

const jsonSchema = new JsonSchema();
addV1(jsonSchema);
```

## Add a schema

Schemas are identified by URI. A `SchemaRegistry` holds schemas you give it
directly, by their `$id`.

```javascript
import { SchemaRegistry } from "@hyperjump/json-schema";

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
```

`$schema` says which dialect the schema is written in. Every schema needs
one.

## Validate

Compile the schema once, then use the validator for as many values as you
like.

```javascript
const validator = await jsonSchema.compile("https://example.com/person");

validator.validate({ name: "Jason", age: 42 }); // true
validator.validate({ age: -1 }); // false
```

Compiling is the slow part. It finds the schema and everything it
references, checks that they're valid schemas, and prepares them for
validation. Validating is fast.

## Find out what's wrong

By default, `validate` only says whether a value is valid. Ask for the
`BASIC` output to get a list of errors.

```javascript
const result = validator.validate({ age: -1 }, { output: "BASIC" });

result.valid; // false
result.errors.length; // 2
```

Each error says where in the value the problem is (`instanceLocation`, a
JSON Pointer) and which keyword failed (`absoluteKeywordLocation`):

| Instance location | Absolute keyword location |
| --- | --- |
| /age | `https://example.com/person#/properties/age/minimum` |
| (empty, the whole object) | `https://example.com/person#/required` |

`/age` is less than the `minimum`, and the object as a whole is missing a
`required` property.

Errors are data, not sentences. `outputErrorMessage` gives one a generic
message:

```javascript
import { outputErrorMessage } from "@hyperjump/json-schema";

for (const error of result.errors) {
  console.log(outputErrorMessage(error));
}
```

```text
'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'
The instance fails the constraint at 'https://example.com/person#/required'
```

[Output and errors](guides/output.md) has the other output format and
everything in an error.

## Validate JSON text

When the data is JSON text, such as a file or a request body, use
`validateJson` instead of parsing it yourself. Errors then have a `place`:
the line and column of the value that failed. Syntax errors are reported
too, and the rest of the text is still validated, so you see every problem
at once.

```javascript
import { toVFileMessage } from "@hyperjump/json-schema";

const json = `{ "name": "Jason", "age": -1, }`;
const result = validator.validateJson(json, { output: "BASIC" });

for (const error of result.errors) {
  console.log(String(toVFileMessage(error)));
}
```

```text
1:27-1:29: Fails the constraint at 'https://example.com/person#/properties/age/minimum'
1:29-1:30: Trailing commas are not allowed
```

## Load schemas from files

Real schemas usually live in files and reference each other. Compile one by
its `file:` URL, and its references are found relative to it. A file is a
schema if its name ends with `.schema.json`.

```json
{
  "$schema": "https://json-schema.org/v1",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "address": { "$ref": "./address.schema.json" }
  },
  "required": ["name"]
}
```

```javascript
import { pathToFileURL } from "node:url";

const uri = pathToFileURL("./schemas/person.schema.json").href;
const validator = await jsonSchema.compile(uri);
```

By default, only files in the working directory can be retrieved, so a
schema can't reference a file elsewhere on the machine or a URL on your
network. [Loading schemas](guides/loading-schemas.md) covers registries,
files, and HTTP, and [Controlling retrieval](guides/retrieval.md) covers
what can be retrieved.

## Lint the schema

A schema can be valid and still not do what its author meant. Lint rules
find those mistakes. `lint` runs the recommended rules on a schema document
and returns what they find.

```javascript
jsonSchema.addRegistry(new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/user",
  "type": "object",
  "properties": { "name": { "type": "string" } },
  "required": ["nmae"]
}`));

const results = await jsonSchema.lint("https://example.com/user");

for (const result of results) {
  console.log(result.message);
  console.log(result.url);
}
```

```text
'nmae' is required, but no 'properties' or 'patternProperties' defines it, so any value is allowed
https://hyperjump.io/json-schema/linting/rules/required-property-not-defined/
```

Every message links to its rule's page, which explains the problem and how
to fix it. To lint every schema in a project, and check JSON files against
their schemas, use the [hjlint](https://github.com/hyperjump-io/hjlint/blob/main/website/README.md)
command line tool.

## Next steps

- [Dialects](guides/dialects.md), if your schemas use draft-07, 2020-12, or
  another version
- [Validating](guides/validating.md), for the other ways to validate,
  including getting annotations
- [Invalid schemas](guides/invalid-schemas.md), for handling a schema with
  mistakes
- [Linting schemas](linting/README.md), for choosing rules and turning them
  off where you need to
