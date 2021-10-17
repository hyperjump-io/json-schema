const { Core, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/draft-04/schema");


// JSON Schema Draft-04
const schemaVersion = "http://json-schema.org/draft-04/schema";

Schema.setConfig(schemaVersion, "baseToken", "id");
Schema.setConfig(schemaVersion, "embeddedToken", "id");
Schema.setConfig(schemaVersion, "anchorToken", "id");
Schema.setConfig(schemaVersion, "jrefToken", "$ref");

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
