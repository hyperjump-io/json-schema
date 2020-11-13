const { Core, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("./keywords");
const metaSchema = require("../meta/draft-07/schema");


const schemaVersion = "http://json-schema.org/draft-07/schema";

Schema.setConfig(schemaVersion, "baseToken", "$id");
Schema.setConfig(schemaVersion, "embeddedToken", "$id");
Schema.setConfig(schemaVersion, "anchorToken", "$id");
Schema.setConfig(schemaVersion, "jrefToken", "$ref");

Schema.add(JSON.parse(metaSchema));
Core.defineVocabulary(schemaVersion, {
  "validate": keywords.validate,
  "additionalItems": keywords.additionalItems6,
  "additionalProperties": keywords.additionalProperties6,
  "allOf": keywords.allOf,
  "anyOf": keywords.anyOf,
  "const": keywords.const,
  "contains": keywords.contains,
  "default": keywords.metaData,
  "definitions": keywords.definitions,
  "dependencies": keywords.dependencies,
  "description": keywords.metaData,
  "enum": keywords.enum,
  "exclusiveMaximum": keywords.exclusiveMaximum,
  "exclusiveMinimum": keywords.exclusiveMinimum,
  "format": keywords.metaData,
  "if": keywords.if,
  "then": keywords.then,
  "else": keywords.else,
  "items": keywords.items,
  "maxItems": keywords.maxItems,
  "maxLength": keywords.maxLength6,
  "maxProperties": keywords.maxProperties,
  "maximum": keywords.maximum,
  "minItems": keywords.minItems,
  "minLength": keywords.minLength6,
  "minProperties": keywords.minProperties,
  "minimum": keywords.minimum,
  "multipleOf": keywords.multipleOf,
  "not": keywords.not,
  "oneOf": keywords.oneOf,
  "pattern": keywords.pattern,
  "patternProperties": keywords.patternProperties,
  "properties": keywords.properties,
  "propertyNames": keywords.propertyNames,
  "readOnly": keywords.metaData,
  "required": keywords.required,
  "title": keywords.metaData,
  "type": keywords.type,
  "uniqueItems": keywords.uniqueItems,
  "writeOnly": keywords.metaData
});
