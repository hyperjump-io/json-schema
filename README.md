# JSchema - JSON Schema Validator
JSchema is a JSON Schema draft 2019-09 JSON validator.

## Install
JSchema is designed to run in a vanilla node.js environment, but has no
dependencies on node.js specific libraries so it can be bundled for the browser.
No compilers, preprocessors, or bundlers are used.

### Node.js
```bash
npm install jschema
```

### Browser
When in a browser context, JSchema is designed to use the browser's `fetch`
implementation instead of a node.js fetch clone. The Webpack bundler does this
properly without any extra configuration, but if you are using the Rollup
bundler you will need to include the `browser: true` option in your Rollup
configuration.

```javascript
  plugins: [
    resolve({
      browser: true
    }),
    commonjs()
  ]
```

## Examples
```javascript
Here are a few examples to get you started quickly. Everything is covered in
more detail further down.

// Example: Inline schema
const schemaJson = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
}
JSchema.add(schemaJson);
const schema = await JSchema.get("http://example.com/schemas/string");

// Example: Fetch from the web
const schema = await JSchema.get("http://example.com/schemas/string");

// Example: Fetch from file
const schema = await JSchema.get("file:///path/to/my/schemas/string.schema.json");

// Example: Validate instance
const output = await JSchema.validate(schema, "foo");
if (output.valid) {
  console.log("Instance is valid :-)");
} else {
  console.log("Instance is invalid :-(");
}

// Example: Precompile validator
const isString = await JSchema.validate(schema);
const output = isString("foo");

// Example: Specify output format
const output = await JSchema.validate(schema, "foo", JSchema.VERBOSE);
```

## $id
JSchema requires that all schemas are identified by at least one URI. There are
two types of schema identifiers, internal and external. An internal identifier
is an identifier that is specified within the schema using `$id`. An external
identifier is an identifier that is specified outside of the schema. In JSchema,
an external identifier can be either the URL a schema is retrieved with, or the
identifier specified when using `JSchema.add` to load a schema.

JSchema can fetch schemas from the web or from the file system, but when
fetching from the file system, there are limitations for security reasons. If
your schema has an identifier with an http scheme (**http**://example.com), it
is not allowed to reference (`$ref`) schemas with a file scheme
(**file**:///path/to/my/schemas).

Internal identifiers (`$id`s) are resolved against the external identifier of
the schema (if one exists) and the resulting URI is used to identify the schema.
All identifiers must be absolute URIs. External identifiers are required to be
absolute URIs and internal identifiers must resolve to absolute URIs.

```javascript
// Example: Inline schema with external identifier
const schemaJson = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "string"
}
JSchema.add(schemaJson, "http://example.com/schemas/string");
const schema = await JSchema.get("http://example.com/schemas/string");

// Example: Inline schema with internal identifier
const schemaJson = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
}
JSchema.add(schemaJson);
const schema = await JSchema.get("http://example.com/schemas/string");

// Example: Inline schema with no identifier
const schemaJson = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "string"
}
JSchema.add(schemaJson); // Error: Couldn't determine an identifier for the schema

// Given the following schema at http://example.com/schemas/foo
// {
//  "$schema": "https://json-schema.org/draft/2019-09/schema",
//  "$id": "http://example.com/schemas/string",
//  "type": "string"
// }

// Example: Fetch schema from external HTTP identifier
const schema = await JSchema.get("http://example.com/schemas/string");

// Example: Fetch schema from internal identifier
const schema = await JSchema.get("http://example.com/schemas/foo");

// Given the following schema at http://example.com/schemas/bar
// {
//  "$schema": "https://json-schema.org/draft/2019-09/schema",
//  "$id": "string",
//  "type": "string"
// }

// Example: Fetch schema from internal identifier resolved against external identifier
const schema = await JSchema.get("http://example.com/schemas/string");

// Given the following schema at /path/to/my/schemas/string.schema.json
// {
//  "$schema": "https://json-schema.org/draft/2019-09/schema",
//  "type": "string"
// }

// Example: Fetch schema from external FILE identifier
const schema = await JSchema.get("file:///path/to/my/schemas/string.schema.json");

// Given the following schema at /path/to/my/schemas/string.schema.json
// {
//  "$schema": "https://json-schema.org/draft/2019-09/schema",
//  "type": "string"
// }
//
// Given the following schema at http://example.com/schemas/baz
// {
//  "$schema": "https://json-schema.org/draft/2019-09/schema",
//  "$ref": "file:///path/to/my/schemas/string.schema.json"
// }

// Example: Reference file from network context
const schema = await JSchema.get("http://example.com/schemas/baz");
const validateString = await JSchema.validate(schema); // Error: Can't access file resource from network context
```

## $schema
JSchema is designed to support multiple drafts of JSON Schema and it makes no
assumption about what draft your schema uses. You need to specify it in some
way. The preferred way is the use `$schema` in all of your schemas, but you can
also specify what draft to use when adding a schema using `JSchema.add`. If a
draft is specified in `JSchema.add` and the schema has a `$schema`, the
`$schema` will be used. If no draft is specified, you will get an error.

```javascript
// Example: Internal schema version
const schemaJSON = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
};
JSchema.add(schemaJSON);

// Example: External schema version
const schemaJSON = {
  "type": "string"
};
JSchema.add(schemaJSON, "http://example.com/schemas/string", "https://json-schema.org/draft/2019-09/schema");

// Example: No schema version
const schemaJSON = {
  "$id": "http://example.com/schemas/string",
  "type": "string"
};
JSchema.add(schemaJSON); // Error: Couldn't determine schema version

// Given the following schema at http://example.com/schemas/foo
// {
//   "type": "string"
// }

// Example: No schema version external
const schema = JSchema.get("http://example.com/schemas/string"); // Error: Couldn't determine schema version
```

## Output
JSchema supports all of the standard output formats specified for JSON Schema
draft-2019-09 and is separately configurable for instance validation and
meta-validtion.

* JSchema.FLAG - Default for instance validation
* JSchema.BASIC
* JSchema.DETAILED - Default for meta-validation
* JSchema.VERBOSE

This implementation does not include the suggested `keywordLocation` property in
the output unit. I think `absoluteKeywordLocation`+`instanceLocation` is
sufficient for debugging and it's awkward for the output to produce JSON
Pointers that potentially won't resolve because they cross schema boundaries.

This implementation includes an extra property in the output unit called
`keyword`. This is an identifier (URI) for the keyword that was validated. With
the standard output unit fields, we can see what keyword was validated by
inspecting the last segment of the `absoluteKeywordLocation` property. But,
since JSchema can support multiple JSON Schema versions, we would have to pull
up the actual schema to find what draft was used. The `schema` property gives us
enough information to not have to go back to the schema to know what draft is
being used.

```javascript
// Example: Specify instance validation output format
JSchema.add({
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
});
const schema = await JSchema.get("http://example.com/schemas/string");
const isString = await JSchema.validate(schema);
const output = isString(42, JSchema.BASIC); // => {
//   "keyword": "https://json-schema.org/draft/2019-09/schema",
//   "absoluteKeywordLocation": "http://example.com/schemas/string#",
//   "instanceLocation": "#",
//   "valid": false,
//   "errors": [
//     {
//       "keyword": "https://json-schema.org/draft/2019-09/schema#type",
//       "absoluteKeywordLocation": "http://example.com/schemas/string#/type",
//       "instanceLocation": "#",
//       "valid": false
//     }
//   ]
// }

// Example: Specify meta-validation output format
JSchema.add({
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "http://example.com/schemas/foo",
  "type": "this-is-not-a-valid-type"
});
JSchema.setMetaOutputFormat(JSchema.BASIC);
const schema = await JSchema.get("http://example.com/schemas/foo");
const isString = await JSchema.validate(schema); // Error: {
//   "keyword": "https://json-schema.org/draft/2019-09/schema",
//   "absoluteKeywordLocation": "https://json-schema.org/draft/2019-09/schema#",
//   "instanceLocation": "#",
//   "valid": false,
//   "errors": [
//     {
//       "keyword": "https://json-schema.org/draft/2019-09/schema#allOf",
//       "absoluteKeywordLocation": "https://json-schema.org/draft/2019-09/schema#/allOf",
//       "instanceLocation": "#",
//       "valid": false
//     }
//     ...
//   ]
// }
```

## Working with Schemas

## Customize
JSchema uses a micro-kernel architecture, so it's highly customizable.
Everything is a plugin, even the validation logic is a plugin. So, in theory,
you can use JSchema as a framework for building other types of JSON Schema based
tools such as code generators or form generators.

In addition to this documentation you should be able to look at the code to see
an example of how to add your custom plugins because it's all implemented the
same way.

### Custom Meta-Schemas
Let's say you want to use a custom meta-schema that does stricter validation
than the standard meta-schema. Once you have your custom meta-schema ready, it's
just a couple lines of code to start using it.

```javascript
const JSchema = require("jschema");

// Optional: Load your meta-schema. If you don't do this, JSchema will fetch it
// using it's identifier when it's needed.
const myCustomMetaSchema = require("./my-custom-meta-schema.schema.json");
JSchema.add(myCustomMetaSchema);

// Choose a unique URI for your meta-schema
// We want validation to function exactly the same way, so we can use the
// standard `validate` keyword.
const validate = require("jschema/lib/keywords/validate");
JSchema.addkeyword("http://example.com/draft/2019-09-strict/schema#validate", validate);

// Use the URI you chose for your meta-schema for the `$schema` in you schemas.
JSchema.add({
  "$schema": "http://example.com/draft/2019-09-strict/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
});
const schema = await JSchema.get("http://example.com/schemas/string");
await JSchema.validate(schema, "foo");
```

### Custom Keywords
Creating a new keyword takes three steps
1. Implement your keyword
1. Create a custom meta-schema to validate your keyword (see previous section)
1. Register your keyword

A keyword implementation is a module with two functions: compile and interpret.
In the compile step, you can do any processing steps necessary to do the actual
validation in the interpret step. The most common thing to do in the compile
step is to compile sub-schemas and follow `$ref`s. The interpret step takes the
result of the compile step and returns a boolean value indicating whether
validation has passed or failed. Use the JSON Schema keyword implementations in
this package as examples to get started.

When you have your new keyword implementation, you'll need a custom meta-schema
to validate that the new keyword is used correctly.

```javascript
// This example implements an `if`/`then`/`else`-like keyword called `cond`.
// `cond` is an array of schemas where the first is the `if` schema, the second
// is the `then` schema, and the third is the `else` schema.
const JSchema = require("jschema");
const validate = require("jschema/lib/keywords/validate");

const cond = {
  compile: async (schema, ast) => {
    const subSchemas = JSchema.map((subSchema) => JSchema.compileSchema(subSchema, ast), schema);
    return Promise.all(subSchemas);
  },

  interpret: (cond, json, ast) => {
    return JSchema.interpretSchema(cond[0], json, ast)
      ? (cond[1] ? Core.interpretSchema(cond[1], json, ast) : true)
      : (cond[2] ? Core.interpretSchema(cond[2], json, ast) : true);
  }
};

JSchema.addkeyword("http://example.com/draft/custom/schema#validate", validate);
JSchema.addkeyword("http://example.com/draft/custom/schema#cond", cond);

JSchema.add({
  "$schema": "http://example.com/draft/custom/schema",
  "$id": "http://example.com/schemas/cond",
  "type": "integer",
  "cond": [
    { "minimum": 10 },
    { "multipleOf": 3 },
    { "multipleOf": 2 }
  ]
});
const schema = await JSchema.get("http://example.com/schemas/cond");
await JSchema.validate(schema, 42);
```

### Vocabularies
You can create vocabularies with JSchema as well. A vocabulary is just a named
collection of keywords. Creating a vocabulary takes three steps:
1. Create a meta-schema for the vocabulary
1. Create a meta-schema that that includes the vocabulary
1. Register the keywords for the vocabulary

```javascript
const JSchema = require("jschema");
const validate = require("jschema/lib/keywords/validate");
const cond = require("./keywords/cond.js");

JSchema.addVocabulary("https://example.com/draft/custom/vocab/conditionals", {
  cond: cond,
});

JSchema.add({
  "$schema": "http://example.com/draft/custom/schema",
  "$id": "http://example.com/schemas/cond",
  "type": "integer",
  "cond": [
    { "minimum": 10 },
    { "multipleOf": 3 },
    { "multipleOf": 2 }
  ]
});
const schema = await JSchema.get("http://example.com/schemas/cond");
await JSchema.validate(schema, 42);
```

## Not (yet) Supported
This implementation supports all required features of JSON Schema draft 2019-09.
The following optional features are not supported yet.

* The `unevaluatedProperties` keyword
* The `unevaluatedItems` keyword
* The format vocabulary

## Backward Compatibility
The JSchema architecture is capable of supporting multiple JSON Schema draft
versions at once, but only draft-2019-09 is currently supported. I have a fork
that supports draft-04, draft-06, and draft-07, but there were some significant
changes in draft-2019-09 and I haven't figured out how to integrate the
differences yet.

## Contributing

### Tests

Run the tests

```bash
npm test
```

Run the tests with a continuous test runner

```bash
npm test -- --watch
```
