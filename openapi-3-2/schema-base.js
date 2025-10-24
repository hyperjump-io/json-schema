export default {
  "$schema": "https://json-schema.org/draft/2020-12/schema",

  "$vocabulary": {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
    "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
    "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
    "https://json-schema.org/draft/2020-12/vocab/content": true,
    "https://spec.openapis.org/oas/3.2/vocab/base": false
  },

  "description": "The description of OpenAPI v3.2.x Documents using the OpenAPI JSON Schema Draft 2020-12 dialect",

  "$ref": "https://spec.openapis.org/oas/3.2/schema",
  "properties": {
    "jsonSchemaDialect": { "$ref": "#/$defs/dialect" }
  },

  "$defs": {
    "dialect": { "const": "https://json-schema.org/draft/2020-12/schema" },

    "schema": {
      "$dynamicAnchor": "meta",
      "$ref": "https://spec.openapis.org/oas/3.2/dialect/base",
      "properties": {
        "$schema": { "$ref": "#/$defs/dialect" }
      }
    }
  }
};
