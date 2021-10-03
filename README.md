# Hyperjump - JSON Schema Validator
JSON Schema Validator (JSV) is built on [JSON Schema Core](https://github.com/hyperjump-io/json-schema-core).

* Supported JSON Schema Dialects
  * draft-04 | draft-06 | draft-07 | Draft 2019-09 | Draft 2020-12
  * Create your own dialect with [JSC](https://github.com/hyperjump-io/json-schema-core)
* Schemas can reference other schemas using a different draft
* Supported vocabularies (new in Draft 2019-09)
  * Draft 2019-09: core | applicator | validation | meta-data | content
  * Draft 2020-12: core | applicator | validation | meta-data | content |
    format-annotations
  * Create your own keywords and vocabularies with [JSC](https://github.com/hyperjump-io/json-schema-core)
* Output formats
  * FLAG, BASIC, DETAILED, VERBOSE
  * Create your own output format with [JSC](https://github.com/hyperjump-io/json-schema-core)
* Load schemas from filesystem (file://), network (http(s)://), or JavaScript
* Build non-validation JSON-Schema based tools with [JSC](https://github.com/hyperjump-io/json-schema-core)

## Install
JSV includes support for node.js JavaScript (CommonJS and ES Modules),
TypeScript, and browsers.

### Node.js
```bash
npm install @hyperjump/json-schema
```

### Browser
When in a browser context, JSV is designed to use the browser's `fetch`
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

### Versioning
This project is in beta and there may be breaking changes at any time. When it's
stable enough, I'll publish v1.0.0 and follow semantic versioning from there on
out.

## Usage
```javascript
const JsonSchema = require("@hyperjump/json-schema");


// Example: Inline schema
const schemaJson = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
};
JsonSchema.add(schemaJson);
const schema = await JsonSchema.get("http://example.com/schemas/string");

// Example: Fetch from the web
const schema = await JsonSchema.get("http://example.com/schemas/string");

// Example: Fetch from file
const schema = await JsonSchema.get("file:///path/to/my/schemas/string.schema.json");

// Example: Validate instance
const output = await JsonSchema.validate(schema, "foo");
if (output.valid) {
  console.log("Instance is valid :-)");
} else {
  console.log("Instance is invalid :-(");
}

// Example: Precompile validator
const isString = await JsonSchema.validate(schema);
const output = isString("foo");

// Example: Specify output format
const output = await JsonSchema.validate(schema, "foo", JsonSchema.VERBOSE);

// Example: Specify meta-validation output format
JsonSchema.setMetaOutputFormat(JsonSchema.FLAG);

// Example: Disable meta-validation
JsonSchema.setShouldMetaValidate(false);
```

## TypeScript
Although the package is written in JavaScript, type definitions are included for
TypeScript support. The following example shows the types you might want to
know.

```typescript
import JsonSchema, { InvalidSchemaError } from "@hyperjump/json-schema";
import type { SchemaDocument, Validator, Result, Draft202012Schema } from "@hyperjump/json-schema";


const schemaJson: Draft202012Schema = {
  "$id": "https://json-schema.hyperjump.io/schema",
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "type": "string"
};
JsonSchema.add(schemaJson);

const schema: SchemaDocument = await JsonSchema.get("https://json-schema.hyperjump.io/schema");
try {
  const isString: Validator = await JsonSchema.validate(schema);
  const result: Result = isString("foo");
  console.log("isString:", result.valid);
} catch (error: unknown) {
  if (error instanceof InvalidSchemaError) {
    console.log(error.output);
  } else {
    console.log(error);
  }
}
```

## API
* **add**: (schema: object, url?: URI, schemaVersion?: string) => SDoc

    Load a schema. See [JSC - $id](https://github.com/hyperjump-io/json-schema-core#id)
    and [JSC - $schema](https://github.com/hyperjump-io/json-schema-core#schema-1)
    for more information.
* **get**: (url: URI, contextDoc?: SDoc, recursive: boolean = false) => Promise<SDoc>

    Fetch a schema. Schemas can come from an HTTP request, a file, or a schema
    that was added with `add`.
* **validate**: (schema: SDoc, instance: any, outputFormat: OutputFormat = FLAG) => Promise<OutputUnit>

    Validate an instance against a schema. The function is curried to allow
    compiling the schema once and applying it to multiple instances.
* **compile**: (schema: SDoc) => Promise<CompiledSchema>

    Compile a schema to be interpreted later. A compiled schema is a JSON
    serializable structure that can be serialized an restored for later use.
* **interpret**: (schema: CompiledSchema, instance: any, outputFormat: OutputFormat = FLAG) => OutputUnit

    A curried function for validating an instance against a compiled schema.
* **setMetaOutputFormat**: (outputFormat: OutputFormat = DETAILED) => undefined

    Set the output format for meta-validation. Meta-validation output is only
    returned if meta-validation results in an error.
* **setShouldMetaValidate**: (isEnabled: boolean) => undefined

    Enable or disable meta-validation.
* **OutputFormat**: [**FLAG** | **BASIC** | **DETAILED** | **VERBOSE**]

    See [JSC - Output](https://github.com/hyperjump-io/json-schema-core#output)
    for more information on output formats.

## Not (yet) Supported
This implementation supports all required features of JSON Schema. The following
optional features are not supported yet.

* The format-assertion vocabulary

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
