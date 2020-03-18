# JSON Schema Validator
JSON Schema Validator (JSV) is built on [JSON Schema Core](https://github.com/jdesrosiers/json-schema-core).

Supported Versions
* Draft-04
* Draft-06
* Draft-07
* Draft 2019-09

## Install
JSV is designed to run in a vanilla node.js environment, but has no dependencies
on node.js specific libraries so it can be bundled for the browser.  No
compilers, preprocessors, or bundlers are used.

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

## Usage
```javascript
const JsonSchema = require("@hyperjump/json-schema");


// Example: Inline schema
const schemaJson = {
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "http://example.com/schemas/string",
  "type": "string"
}
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
```

## API
* **add**: (schema: object, url?: URI, schemaVersion?: string) => undefined

    Load a schema. See [JSC - $id](https://github.com/jdesrosiers/json-schema-core#id)
    and [JSC - $schema](https://github.com/jdesrosiers/json-schema-core#schema-1)
    for more information.
* **get**: (url: URI, contextDoc?: SDoc, recursive: boolean = false) => Promise<SDoc>

    Fetch a schema. Schemas can come from an HTTP request, a file, or a schema
    that was added with `add`.
* **validate**: (schema: SDoc, instance: any, outputFormat: OutputFormat = FLAG) => OutputUnit

    Validate an instance against a schema. The function is curried to allow
    compiling the schema once and applying it to multiple instances. See
* **setMetaOutputFormat**: (outputFormat: OutputFormat = DETAILED) => undefined

    Set the output format for meta-validation.
* OutputFormat: [**FLAG** | **BASIC** | **DETAILED** | **VERBOSE**]

    [JSC - Output](https://github.com/jdesrosiers/json-schema-core#output) for
    more information on output formats.

## Not (yet) Supported
This implementation supports all required features of JSON Schema draft 2019-09.
The following optional features are not supported yet.

* The `unevaluatedProperties` keyword
* The `unevaluatedItems` keyword
* The format vocabulary

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
