# Hyperjump - JSON Schema

A collection of modules for working with JSON Schemas.

* Validate JSON-compatible values against a JSON Schema
  * Dialects: draft-2020-12, draft-2019-09, draft-07, draft-06, draft-04
  * OpenAPI
    * Versions/Dialects: 3.0, 3.1
    * Validate an OpenAPI document
    * Validate values against a schema from an OpenAPI document
  * Schemas can reference other schemas using a different dialect
  * Work directly with schemas on the filesystem or HTTP
* Create custom keywords, vocabularies, and dialects
* Bundle multiple schemas into one document
  * Uses the process defined in the 2020-12 specification but works with any
    dialect.
* Provides utilities for building non-validation JSON Schema tooling

## Install
Includes support for node.js (ES Modules, TypeScript) and browsers.

### Node.js
```bash
npm install @hyperjump/json-schema
```

### Browser
When in a browser context, this library is designed to use the browser's `fetch`
implementation instead of a node.js fetch clone. The Webpack bundler does this
properly without any extra configuration, but if you are using the Rollup
bundler you will need to include the `browser: true` option in your Rollup
configuration.

```javascript
  plugins: [
    resolve({
      browser: true
    })
  ]
```

### Versioning
The API for this library is divided into two categories: Stable and
Experimental. The Stable API strictly follows semantic versioning, but the
Experimental API may have backward-incompatible changes between minor versions.

All experimental features are segregated into exports that include the word
"experimental" so you never accidentally depend on something that could change
or be removed in future releases.

## Validation
### Usage
This library supports many versions of JSON Schema. Use the pattern
`@hyperjump/json-schema/*` to import the version you need.

```javascript
import { addSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
```

You can import support for additional versions as needed.

```javascript
import { addSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-07";
```

**Note**: The default export (`@hyperjump/json-schema`) is reserved for the
stable version of JSON Schema that will hopefully be released in 2023.

**Validate schema from JavaScript**
```javascript
addSchema({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "string"
}, "http://example.com/schemas/string");

const output = await validate("http://example.com/schemas/string", "foo");
if (output.valid) {
  console.log("Instance is valid :-)");
} else {
  console.log("Instance is invalid :-(");
}
```

**Compile schema**

If you need to validate multiple instances against the same schema, you can
compile the schema into a reusable validation function.

```javascript
const isString = await validate("http://example.com/schemas/string");
const output1 = isString("foo");
const output2 = isString(42);
```

**Fetching schemas**

You can fetch schemas from the web or from the file system, but when fetching
from the file system, there are limitations for security reasons. If your schema
has an identifier with an http(s) scheme (**https**://example.com), it's not
allowed to reference schemas with a file scheme
(**file**:///path/to/my/schemas).

```javascript
const output = await validate("http://example.com/schemas/string", "foo");
```

```javascript
const output = await validate(`file://${__dirname}/string.schema.json`, "foo");
```

**Media type plugins**

There is a plugin system for adding support for different media types. By
default it's configured to accept schemas that have the
`application/schema+json` Content-Type (web) or a `.schema.json` file extension
(filesystem). If, for example, you want to fetch schemas that are written in
YAML, you can add a MediaTypePlugin to support that.

```javascript
import { addMediaTypePlugin, validate } from "@hyperjump/json-schema/draft-2020-12";
import YAML from "yaml";


// Add support for JSON Schemas written in YAML
addMediaTypePlugin("application/schema+yaml", {
  parse: async (response) => [YAML.parse(await response.text()), undefined],
  matcher: (path) => path.endsWith(".schema.yaml")
});

// Example: Fetch schema with Content-Type: application/schema+yaml from the web
const isString = await validate("http://example.com/schemas/string");

// Example: Fetch from file with JSON Schema YAML file extension
const isString = await validate(`file://${__dirname}/string.schema.yaml`);

// Then validate against your schema like normal
const output = isString("foo");
```

**OpenAPI**

The OpenAPI 3.0 and 3.1 meta-schemas are pre-loaded and the OpenAPI JSON Schema
dialects for each of those versions is supported. A document with a Content-Type
of `application/openapi+json` (web) or a file extension of `openapi.json`
(filesystem) is understood as an OpenAPI document.

Use the pattern `@hyperjump/json-schema/*` to import the version you need. The
available versions are `openapi-3-0` for 3.0 and `openapi-3-1` for 3.1.

YAML support isn't built in, but you can add it by writing a MediaTypePlugin.
You can use the one at `lib/openapi.js` as an example and replacing the JSON
parts with YAML.

```javascript
import { addSchema, validate } from "@hyperjump/json-schema/openapi-3-1";


// Validate an OpenAPI document
const output = await validate("https://spec.openapis.org/oas/3.1/schema-base", openapi);

// Validate an instance against a schema in an OpenAPI document
const output = await validate(`file://${__dirname}/example.openapi.json#/components/schemas/foo`, 42);
```

### API
These are available from any of the exports that refer to a version of JSON
Schema, such as `@hyperjump/json-schema/draft-2020-12`.

* **addSchema**: (schema: object, retrievalUri?: string, defaultDialectId?: string) => void

    Load a schema manually rather than fetching it from the filesystem or over
    the network.
* **validate**: (schemaURI: string, instance: any, outputFormat: OutputFormat = FLAG) => Promise<OutputUnit>

    Validate an instance against a schema. This function is curried to allow
    compiling the schema once and applying it to multiple instances.
* **validate**: (schemaURI: string) => Promise<(instance: any, outputFormat: OutputFormat = FLAG) => OutputUnit>

    Compiling a schema to a validation function.
* **FLAG**: "FLAG"

    An identifier for the `FLAG` output format as defined by the 2019-09 and
    2020-12 specifications.
* **InvalidSchemaError**: Error & { output: OutputUnit }

    This error is thrown if the schema being compiled is found to be invalid.
    The `output` field contains an `OutputUnit` with information about the
    error. You can use the `setMetaSchemaOutputFormat` configuration to set the
    output format that is returned in `output`.
* **setMetaSchemaOutputFormat**: (outputFormat: OutputFormat) => void

    Set the output format used for validating schemas.
* **getMetaSchemaOutputFormat**: () => OutputFormat

    Get the output format used for validating schemas.
* **setShouldMetaValidate**: (isEnabled: boolean) => void

    Enable or disable validating schemas.
* **getShouldMetaValidate**: (isEnabled: boolean) => void

    Determine if validating schemas is enabled.
* **addMediaTypePlugin**: (contentType: string, plugin: MediaTypePlugin) => void

    Add a custom media type handler to support things like YAML or to change the
    way JSON is supported.

**Type Definitions**

The following types are used in the above definitions

* **OutputFormat**: **FLAG**

    Only the `FLAG` output format is part of the Stable API. Additional output
    formats are included as part of the Experimental API.
* **OutputUnit**: { valid: boolean }

    Output is an experimental feature of the JSON Schema specification. There
    may be additional fields present in the OutputUnit, but only the `valid`
    property should be considered part of the Stable API.
* **MediaTypePlugin**: object

    * parse: (response: Response, mediaTypeParameters: object) => [object | boolean, string?]

      Given a fetch Response object, parse the body of the request. Return the
      parsed schema and an optional default dialectId.
    * matcher: (path) => boolean

      Given a filesystem path, return whether or not the file should be
      considered a member of this media type.

## Bundling
### Usage
You can bundle schemas with external references into single deliverable using
the official JSON Schema bundling process introduced in the 2020-12
specification. Given a schema with external references, any external schemas
will be embedded in the schema resulting in a Compound Schema Document with all
the schemas necessary to evaluate the given schema in one document.

The bundling process allows schemas to be embedded without needing to modify any
references which means you get the same output details whether you validate the
bundle or the original unbundled schemas.

```javascript
import { addSchema } from "@hyperjump/json-schema/draft-2020-12";
import { bundle } from "@hyperjump/json-schema/bundle";

addSchema({
  "$id": "https://example.com/main"
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "type": "object",
  "properties": {
    "foo": { "$ref": "/string" }
  }
});

addSchema({
  "$id": "https://example.com/string",
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "type": "string"
});

const bundledSchema = await bundle("https://example.com/main"); // {
//   "$id": "https://example.com/main",
//   "$schema": "https://json-schema.org/draft/2020-12/schema",
//
//   "type": "object",
//   "properties": {
//     "foo": { "$ref": "/string" }
//   },
//
//   "$defs": {
//     "https://example.com/main": {
//       "$id": "https://example.com/main",
//       "type": "string"
//     }
//   }
// }
```

### API
These are available from the `@hyperjump/json-schema/bundle` export.

* **bundle**: (uri: string, options: Options) => Promise<SchemaObject>

    Create a bundled schema starting with the given schema. External schemas
    will be fetched from the filesystem, the network, or internally as needed.

    Options:
     * alwaysIncludeDialect: boolean (default: false) -- Include dialect even
       when it isn't strictly needed
     * bundleMode: "flat" | "full" (default: "flat") -- When bundling schemas
       that already contain bundled schemas, "flat" mode with remove nested
       embedded schemas and put them all in the top level `$defs`. When using
       "full" mode, it will keep the already embedded schemas around, which will
       result in some embedded schema duplication.
     * definitionNamingStrategy: "uri" | "uuid" (default: "uri") -- By default
       the name used in definitions for embedded schemas will match the
       identifier of the embedded schema. This naming is unlikely to collide
       with actual definitions, but if you want to be sure, you can use the
       "uuid" strategy instead to be sure you get a unique name.
     * externalSchemas: string[] (default: []) -- A list of schemas URIs that
       are available externally and should not be included in the bundle.

## Output Formats (Experimental)
### Usage

**Change the validation output format**

The `FLAG` output format isn't very informative. You can change the output
format used for validation to get more information about failures.

```javascript
import { BASIC } from "@hyperjump/json-schema/experimental";

const output = await validate("https://example.com/schema1", 42, BASIC);
```

**Change the schema validation output format**

The output format used for validating schemas can be changed as well.

```javascript
import { validate, setMetaSchemaOutputFormat } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";

setMetaSchemaOutputFormat(BASIC);
try {
  const output = await validate("https://example.com/invalid-schema");
} catch (error) {
  console.log(error.output);
}
```

### API
**Type Definitions**

* **OutputFormat**: **FLAG** | **BASIC** | **DETAILED** | **VERBOSE**

    In addition to the `FLAG` output format in the Stable API, the Experimental
    API includes support for the `BASIC`, `DETAILED`, and `VERBOSE` formats as
    specified in the 2019-09 specification (with some minor customizations).
    This implementation doesn't include annotations or human readable error
    messages. The output can be processed to create human readable error
    messages as needed.

## Meta-Schemas, Keywords, Vocabularies, and Dialects (Experimental)
### Usage
In order to create and use a custom keyword, you need to define your keyword's
behavior, create a vocabulary that includes that keyword, and then create a
dialect that includes your vocabulary.

```javascript
import { addSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { addKeyword, defineVocabulary, Validation } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/json-schema/schema/experimental";


// Define a keyword that's an array of schemas that are applied sequentially
// using implication: A -> B -> C -> D
addKeyword({
  id: "https://example.com/keyword/implication",

  compile: (schema, ast) => {
    return Schema.map(async (itemSchema) => Validation.compile(await itemSchema, ast), schema);
  },

  interpret: (implies, instance, ast, dynamicAnchors) => {
    return implies.reduce((acc, schema) => {
      return !acc || Validation.interpret(schema, instance, ast, dynamicAnchors);
    }, true);
  }
});

// Create a vocabulary with this keyword and call it "implies"
defineVocabulary("https://example.com/vocab/logic", {
  "implies": "https://example.com/keyword/implication"
});

// Create a vocabulary schema for this vocabulary
addSchema({
  "$id": "https://example.com/meta/logic",
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "$dynamicAnchor": "meta",
  "properties": {
    "implies": {
      "type": "array",
      "items": { "$dynamicRef": "meta" },
      "minItems": 2
    }
  }
});

// Create a dialect schema adding this vocabulary to the standard JSON Schema
// vocabularies
addSchema({
  "$id": "https://example.com/dialect/logic",
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "$vocabulary": {
    "https://json-schema.org/vocab/core": true,
    "https://json-schema.org/vocab/applicator": true,
    "https://json-schema.org/vocab/unevaluated": true,
    "https://json-schema.org/vocab/validation": true,
    "https://json-schema.org/vocab/meta-data": true,
    "https://json-schema.org/vocab/format-annotation": true,
    "https://json-schema.org/vocab/content": true,
    "https://example.com/vocab/logic": true
  },

  "$dynamicAnchor": "meta",

  "allOf": [
    { "$ref": "https://json-schema.org/draft/2020-12/schema" },
    { "$ref": "/meta/logic" }
  ]
});

// Use your dialect to validate a JSON instance
addSchema({
  "$schema": "https://example.com/dialect/logic",

  "type": "number",
  "implies": [
    { "minimum": 10 },
    { "multipleOf": 2 }
  ]
}, "https://example.com/schema1");
const output = await validate("https://example.com/schema1", 42);
```

**Custom Meta Schema**

You can use a custom meta-schema to restrict users to a subset of JSON Schema
functionality. This example requires that no unknown keywords are used in the
schema.

```javascript
addSchema({
  "$id": "https://example.com/meta-schema1",
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "$vocabulary": {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
    "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
    "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
    "https://json-schema.org/draft/2020-12/vocab/content": true
  },

  "$dynamicAnchor": "meta",

  "$ref": "https://json-schema.org/draft/2020-12/schema",
  "unevaluatedProperties": false
});

addSchema({
  $schema: "https://example.com/meta-schema1",
  type: "number",
  foo: 42
}, "https://example.com/schema1");

const output = await validate("https://example.com/schema1", 42); // Expect InvalidSchemaError
```

### API
These are available from the `@hyperjump/json-schema/experimental` export.

* **addKeyword**: (keywordHandler: Keyword) => void

    Define a keyword for use in a vocabulary.
* **defineVocabulary**: (id: string, keywords: { [keyword: string]: string }) => void

    Define a vocabulary that maps keyword name to keyword URIs defined using
    `addKeyword`.
* **getKeyword**: (keywordId: string) => Keyword

    Get a keyword object by its URI. This is useful for building non-validation
    tooling.
* **getKeywordName**: (dialectId: string, keywordId: string) => string

    Determine a keyword's name given its URI a dialect URI. This is useful when
    defining a keyword that depends on the value of another keyword (such as how
    `contains` depends on `minContains` and `maxContains`).
* **loadDialect**: (dialectId: string, dialect: { [vocabularyId: string] }) => void

    Define a dialect. In most cases, dialects are loaded automatically from the
    `$vocabulary` keyword in the meta-schema. The only time you would need to
    load a dialect manually is if you're creating a distinct version of JSON
    Schema rather than creating a dialect of an existing version of JSON Schema.
* **Validation**: Keyword

    A Keyword object that represents a "validate" operation. You would use this
    for compiling and evaluating sub-schemas when defining a custom keyword.

* **Keyword**: object
    * id: string

        A URI that uniquely identifies the keyword. It should use a domain you
        own to avoid conflict with keywords defined by others.
    * compile: (schema: SchemaDocument, ast: AST, parentSchema: SchemaDocument) => Promise<A>

        This function takes the keyword value, does whatever preprocessing it
        can on it without an instance, and returns the result. The returned
        value will be passed to the `interpret` function. The `ast` parameter is
        needed for compiling sub-schemas. The `parentSchema` parameter is
        primarily useful for looking up the value of an adjacent keyword that
        might effect this one.
    * interpret: (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors) => boolean

        This function takes the value returned by the `compile` function and the
        instance value that is being validated and returns whether the value is
        valid or not. The other parameters are only needed for validating
        sub-schemas.
    * collectEvaluatedProperties?: (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors) => string[] | false

        If the keyword is an applicator, it will need to implements this
        function for `unevaluatedProperties` to work as expected.
    * collectEvaluatedItems?: (compiledKeywordValue: A, instance: JsonDocument, ast: AST, dynamicAnchors: Anchors) => Set<number> | false

        If the keyword is an applicator, it will need to implements this
        function for `unevaluatedItems` to work as expected.

### Schema API
These functions are available from the
`@hyperjump/json-schema/schema/experimental` export.

This library uses SchemaDocument objects to represent a value in a schema.
You'll work with these objects if you create a custom keyword. This module is a
set of functions for working with SchemaDocuments.

* **Schema.add**: (schema: object, retrievalUri?: string, dialectId?: string) => string

    Load a schema. Returns the identifier for the schema.
* **Schema.get**: (url: string, contextDoc?: SchemaDocument) => Promise<SchemaDocument>

    Fetch a schema. Schemas can come from an HTTP request, a file, or a schema
    that was added with `Schema.add`.
* **Schema.uri**: (doc: SchemaDocument) => string

    Returns a URI for the value the SchemaDocument represents.
* **Schema.value**: (doc: SchemaDocument) => any

    Returns the value the SchemaDocument represents.
* **Schema.typeOf**: (doc: SchemaDocument, type: string) => boolean

    Determines if the JSON type of the given doc matches the given type.
* **Schema.has**: (key: string, doc: SchemaDocument) => Promise<SchemaDocument>

    Similar to `key in schema`.
* **Schema.step**: (key: string, doc: SchemaDocument) => Promise<SchemaDocument>

    Similar to `schema[key]`, but returns an SchemaDocument.
* **Schema.entries**: (doc: SchemaDocument) => Promise<[[string, SchemaDocument]]>

    Similar to `Object.entries`, but returns SchemaDocuments for values.
* **Schema.keys**: (doc: SchemaDocument) => [string]

    Similar to `Object.keys`.
* **Schema.map**: (fn: (item: Promise<SchemaDocument>, index: integer) => T, doc: SchemaDocument) => Promise<[T]>

    A `map` function for an SchemaDocument whose value is an array.
* **Schema.length**: (doc: SchemaDocument) => number

    Similar to `Array.prototype.length`.
* **Schema.toSchema**: (doc: SchemaDocument, options: ToSchemaOptions) => object

    Get a raw schema from a Schema Document.

**Type Definitions**

The following types are used in the above definitions

* **ToSchemaOptions**: object

    * parentId: string (default: "") -- `file://` URIs will be generated
      relative to this path.
    * parentDialect: string (default: "") -- If the dialect of the schema
    * matches this value, the `$schema` keyword will be omitted.
    * includeEmbedded: boolean (default: true) -- If false, embedded schemas
      will be unbundled from the schema.

### Instance API
These functions are available from the
`@hyperjump/json-schema/instance/experimental` export.

This library uses InstanceDocument objects to represent a value in an instance.
You'll work with these objects if you create a custom keyword. This module is a
set of functions for working with InstanceDocuments.

* **Instance.cons**: (instance: any, uri?: string) => InstanceDocument

    Construct an InstanceDocument from a value.
* **Instance.get**: (url: string, contextDoc: InstanceDocument) => InstanceDocument

    Apply a same-resource reference to a InstanceDocument.
* **Instance.uri**: (doc: InstanceDocument) => string

    Returns a URI for the value the InstanceDocument represents.
* **Instance.value**: (doc: InstanceDocument) => any

    Returns the value the InstanceDocument represents.
* **Instance.has**: (key: string, doc: InstanceDocument) => any

    Similar to `key in instance`.
* **Instance.typeOf**: (doc: InstanceDocument, type: string) => boolean

    Determines if the JSON type of the given doc matches the given type.
* **Instance.step**: (key: string, doc: InstanceDocument) => InstanceDocument

    Similar to `schema[key]`, but returns a InstanceDocument.
* **Instance.entries**: (doc: InstanceDocument) => [string, InstanceDocument]

    Similar to `Object.entries`, but returns IDocs for values.
* **Instance.keys**: (doc: InstanceDocument) => [string]

    Similar to `Object.keys`.
* **Instance.map**: (fn: (item: InstanceDocument, index: integer) => T, doc: InstanceDocument) => [T]

    A `map` function for an InstanceDocument whose value is an array.
* **Instance.reduce**: (fn: (accumulator: T, item: InstanceDocument, index: integer) => T, initial: T, doc: InstanceDocument) => T

    A `reduce` function for an InstanceDocument whose value is an array.
* **Instance.every**: (fn: (doc: InstanceDocument, index: integer) => boolean, doc: InstanceDocument) => boolean

    An `every` function for an InstanceDocument whose value is an array.
* **Instance.some**: (fn: (doc: InstanceDocument, index: integer) => boolean, doc: InstanceDocument) => boolean

    A `some` function for an InstanceDocument whose value is an array.
* **Instance.length**: (doc: InstanceDocument) => number

    Similar to `Array.prototype.length`.

## Low-level Utilities (Experimental)
### API
These are available from the `@hyperjump/json-schema/experimental` export.

* **compile**: (schema: SchemaDocument) => Promise<CompiledSchema>

    Return a compiled schema. This is useful if you're creating tooling for
    something other than validation.
* **interpret**: (schema: CompiledSchema, instance: Instance, outputFormat: OutputFormat = BASIC) => OutputUnit

    A curried function for validating an instance against a compiled schema.
    This can be useful for creating custom output formats.

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
