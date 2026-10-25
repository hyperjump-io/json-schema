# Getting started

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
