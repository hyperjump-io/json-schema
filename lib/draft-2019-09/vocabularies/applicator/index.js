const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/applicator.json");
const draft07Keywords = require("../../../draft-07/keywords");
const keywords = require("./keywords");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/applicator", {
  "additionalItems": draft07Keywords.additionalItems,
  "additionalProperties": draft07Keywords.additionalProperties,
  "allOf": draft07Keywords.allOf,
  "anyOf": draft07Keywords.anyOf,
  "contains": draft07Keywords.contains,
  "dependentSchemas": keywords.dependentSchemas,
  "if": draft07Keywords.ifThenElse,
  "items": draft07Keywords.items,
  "not": draft07Keywords.not,
  "oneOf": draft07Keywords.oneOf,
  "patternProperties": draft07Keywords.patternProperties,
  "properties": draft07Keywords.properties,
  "propertyNames": draft07Keywords.propertyNames
});
