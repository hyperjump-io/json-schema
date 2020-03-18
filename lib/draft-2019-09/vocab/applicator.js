const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("../meta/meta/applicator.schema.json");
const keywords = require("../../keywords");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/applicator", {
  "additionalItems": keywords.additionalItems,
  "additionalProperties": keywords.additionalProperties,
  "allOf": keywords.allOf,
  "anyOf": keywords.anyOf,
  "contains": keywords.contains,
  "dependentSchemas": keywords.dependentSchemas,
  "if": keywords.ifThenElse,
  "items": keywords.items,
  "not": keywords.not,
  "oneOf": keywords.oneOf,
  "patternProperties": keywords.patternProperties,
  "properties": keywords.properties,
  "propertyNames": keywords.propertyNames
});
