# Getting started

This tutorial takes you from installing the library to validating data.
Along the way you'll find out what's wrong with invalid data, load schemas
from files, and lint them. Each step builds on the one before it.

## Install

```bash
npm install @hyperjump/json-schema
```

It's an ES module with TypeScript types. It works in Node.js and in
browsers. In a browser, use a bundler that supports the `imports` field of
`package.json`. Vite, webpack, esbuild, and Rollup all do.

## Create a `JsonSchema`

A `JsonSchema` holds everything your application's schemas need. That's the
dialects it supports and its configuration. A
dialect is a version of JSON Schema. Most applications create one
`JsonSchema` and use it everywhere.

It starts without any dialects, so give it the ones your schemas use. This
tutorial uses JSON Schema v1. [Dialects](guides/dialects.md) lists the
others.

```typescript
import { configureJsonSchema } from "@hyperjump/json-schema";
import { v1Dialect } from "@hyperjump/json-schema/v1";

const jsonSchema = configureJsonSchema({ dialects: [v1Dialect] });
```

## Add a schema

Schemas are identified by URI. A `SchemaRegistry` holds schemas you give
it directly. It stores them by their `$id`. `with` returns a new registry
that includes the schema. You'll pass the registry to each call that needs
its schemas.

```typescript
import { SchemaRegistry } from "@hyperjump/json-schema";
import type { V1Schema } from "@hyperjump/json-schema/v1";

const registry = new SchemaRegistry<V1Schema>().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  title: "Person",
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 0 }
  },
  required: ["name"]
});
```

`$schema` says which dialect the schema is written in. Every schema needs
one.

The registry's type is `V1Schema`, so it only accepts v1 schemas. That
means TypeScript checks the schema as you write it. A misspelled keyword is
a type error:

```typescript
new SchemaRegistry<V1Schema>().with({
  $schema: "https://json-schema.org/v1",
  $id: "https://example.com/person",
  type: "object",
  properties: { name: { type: "string", minLenght: 1 } }
});
```

```text
Object literal may only specify known properties, but 'minLenght' does not exist in type ... Did you mean to write 'minLength'?
```

[Schema types](guides/schema-types.md) lists each dialect's type. It also
shows how to check schemas that aren't in a registry.

## Validate

`validator` compiles the schema once. It finds the schema in the registry
you give it. It returns a function you can call on as many values as you
like.

```typescript
import { validator } from "@hyperjump/json-schema";

const isPerson = await validator(jsonSchema, "https://example.com/person", { registry });

isPerson({ name: "Jason", age: 42 }); // true
isPerson({ age: -1 }); // false
```

Compiling is the slow part. It finds the schema and everything it
references, checks that they're valid schemas, and prepares them for
validation. Validating is fast.

For a one-off check, `validate` compiles and validates in one call. You can
pass the schema as a value instead of a URI. It compiles every time, so use
`validator` for anything you validate more than once.

```typescript
import { validate } from "@hyperjump/json-schema";

await validate(jsonSchema, { $schema: "https://json-schema.org/v1", type: "string" }, 42); // false
```

## Find out what's wrong

By default, a validator only says whether a value is valid. Ask for the
`BASIC` output format to get a list of errors.

```typescript
import { BASIC } from "@hyperjump/json-schema";

const checkPerson = await validator(jsonSchema, "https://example.com/person", { registry, output: BASIC });
const result = checkPerson({ age: -1 });

result.valid; // false
result.errors.length; // 2
```

The output format decides what validation returns and what type it has.
With `BASIC`, `result` is a `BasicOutput`.

Each error says where in the value the problem is and which keyword failed.
`instanceLocation` is a JSON Pointer to the value. `absoluteKeywordLocation`
is the keyword:

| Instance location | Absolute keyword location |
| --- | --- |
| /age | `https://example.com/person#/properties/age/minimum` |
| (empty, the whole object) | `https://example.com/person#/required` |

`/age` is less than the `minimum`. The object as a whole is missing a
`required` property.

Errors are data, not sentences. `outputErrorMessage` turns an error into a
generic message:

```typescript
import { outputErrorMessage } from "@hyperjump/json-schema";

for (const error of result.errors) {
  console.log(outputErrorMessage(error));
}
```

```text
'/age' fails the constraint at 'https://example.com/person#/properties/age/minimum'
The instance fails the constraint at 'https://example.com/person#/required'
```

[Output and errors](guides/output.md) covers the other output format and
everything an error contains.

## Validate JSON text

When the data is JSON text, like a file or a request body, pass
`input: "json"` instead of parsing it yourself. Then each error has a
`place`, which is the line and column of the value that failed. Syntax
errors are reported too. The rest of the text is still validated, so you
see every problem at once.

To print errors the way unified tools do, add them to a
[`VFile`](https://github.com/vfile/vfile) and use
[`vfile-reporter`](https://github.com/vfile/vfile-reporter).
Install them with `npm install vfile vfile-reporter`. A failed constraint
is an error. A syntax error the parser recovered from is a warning.

```typescript
import { VFile } from "vfile";
import { reporter } from "vfile-reporter";

const file = new VFile({
  path: "person.json",
  value: `{ "name": "Jason", "age": -1, }`
});
const checkText = await validator(jsonSchema, "https://example.com/person", { registry, input: "json", output: BASIC });
const result = checkText(String(file));

for (const error of result.errors) {
  const message = file.message(outputErrorMessage(error), {
    place: error.place,
    ruleId: error.ruleId,
    source: error.source
  });
  message.fatal = error.source === "json-schema";
}

console.log(reporter(file));
```

```text
person.json
1:27-1:29 error   Fails the constraint at 'https://example.com/person#/properties/age/minimum' https://json-schema.org/keyword/minimum json-schema
1:29-1:30 warning Trailing commas are not allowed                                              trailing-comma                          json

2 messages (✖ 1 error, ⚠ 1 warning)
```

[Reporting errors](unified/reporting-errors.md) has more on turning errors
into messages.

## Load schemas from files

Real schemas usually live in files and reference each other. Compile a
schema by its `file:` URL, and its references are resolved relative to it.
A file is a schema if its `$schema` is a dialect or its name ends with
`.schema.json`.

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

```typescript
import { pathToFileURL } from "node:url";

const uri = pathToFileURL("./schemas/person.schema.json").href;
const isPerson = await validator(jsonSchema, uri);
```

By default, only files in the working directory can be retrieved. A schema
can't reference a file elsewhere on the machine or a URL on your network.
[Loading schemas](guides/loading-schemas.md) covers registries, files, and
HTTP. [Controlling retrieval](guides/retrieval.md) covers what can be
retrieved.

## Lint the schema

A schema can be valid and still not do what its author meant. Lint rules
find those mistakes. `lint` runs the recommended rules on a schema document.
It returns what they find as `SchemaMessage`s.

```typescript
import { lint } from "@hyperjump/json-schema";

const users = new SchemaRegistry().with(`{
  "$schema": "https://json-schema.org/v1",
  "$id": "https://example.com/user",
  "type": "object",
  "properties": { "name": { "type": "string" } },
  "required": ["nmae"]
}`);

const results = await lint(jsonSchema, "https://example.com/user", { registry: users });

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
to fix it. To lint every schema in a project and check JSON files against
their schemas, use the
[Hyperjump CLI](https://github.com/hyperjump-io/cli/blob/main/website/README.md).

## Next steps

- [Dialects](guides/dialects.md) if your schemas use draft-07, 2020-12, or
  another version
- [Validating](guides/validating.md) for the other ways to validate,
  including how to get annotations
- [Invalid schemas](guides/invalid-schemas.md) for handling a schema with
  mistakes
- [Linting schemas](linting/README.md) for choosing rules and turning them
  off where you need to
