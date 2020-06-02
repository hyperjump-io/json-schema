const { Core, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/draft-04/schema");
const metaHyperSchema = require("../meta/draft-04/hyper-schema");


// JSON Schema Draft-04
const schemaVersion = "http://json-schema.org/draft-04/schema";

Schema.setConfig(schemaVersion, "jrefToken", "$ref");
Schema.setConfig(schemaVersion, "idToken", "id");
Schema.setConfig(schemaVersion, "anchorToken", "id");

Schema.add(JSON.parse(metaSchema));
Core.defineVocabulary(schemaVersion, {
  "validate": keywords.validate,
  "additionalItems": keywords.additionalItems,
  "additionalProperties": keywords.additionalProperties,
  "allOf": keywords.allOf,
  "anyOf": keywords.anyOf,
  "default": keywords.metaData,
  "definitions": keywords.definitions,
  "dependencies": keywords.dependencies,
  "description": keywords.metaData,
  "enum": keywords.enum,
  "format": keywords.metaData,
  "items": keywords.items,
  "maxItems": keywords.maxItems,
  "maxLength": keywords.maxLength,
  "maxProperties": keywords.maxProperties,
  "maximum": keywords.maximumExclusiveMaximum,
  "minItems": keywords.minItems,
  "minLength": keywords.minLength,
  "minProperties": keywords.minProperties,
  "minimum": keywords.minimumExclusiveMinimum,
  "multipleOf": keywords.multipleOf,
  "not": keywords.not,
  "oneOf": keywords.oneOf,
  "pattern": keywords.pattern,
  "patternProperties": keywords.patternProperties,
  "properties": keywords.properties,
  "required": keywords.required,
  "title": keywords.metaData,
  "type": keywords.type,
  "uniqueItems": keywords.uniqueItems
});

// JSON Hyper-Schema Draft-04
const hyperSchemaVersion = "http://json-schema.org/draft-04/hyper-schema";

Schema.setConfig(hyperSchemaVersion, "jrefToken", "$ref");
Schema.setConfig(hyperSchemaVersion, "idToken", "id");
Schema.setConfig(hyperSchemaVersion, "anchorToken", "id");

Schema.add(JSON.parse(metaHyperSchema));
Core.defineVocabulary(hyperSchemaVersion, {
  "validate": keywords.validate,
  "additionalItems": keywords.additionalItems,
  "additionalProperties": keywords.additionalProperties,
  "allOf": keywords.allOf,
  "anyOf": keywords.anyOf,
  "default": keywords.metaData,
  "definitions": keywords.definitions,
  "dependencies": keywords.dependencies,
  "description": keywords.metaData,
  "enum": keywords.enum,
  "format": keywords.metaData,
  "fragmentResolution": keywords.metaData,
  "items": keywords.items,
  "maxItems": keywords.maxItems,
  "minProperties": keywords.minProperties,
  "maxProperties": keywords.maxProperties,
  "maximum": keywords.maximumExclusiveMaximum,
  "media": keywords.metaData,
  "minItems": keywords.minItems,
  "minLength": keywords.minLength,
  "maxLength": keywords.maxLength,
  "minimum": keywords.minimumExclusiveMinimum,
  "multipleOf": keywords.multipleOf,
  "links": keywords.metaData,
  "not": keywords.not,
  "oneOf": keywords.oneOf,
  "pathStart": keywords.metaData,
  "pattern": keywords.pattern,
  "patternProperties": keywords.patternProperties,
  "properties": keywords.properties,
  "readOnly": keywords.metaData,
  "required": keywords.required,
  "title": keywords.metaData,
  "type": keywords.type,
  "uniqueItems": keywords.uniqueItems
});
