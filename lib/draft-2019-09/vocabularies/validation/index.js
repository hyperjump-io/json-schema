const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/validation.json");
const draft07Keywords = require("../../../draft-07/keywords");
const keywords = require("./keywords");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/validation", {
  "const": draft07Keywords.const,
  "dependentRequired": keywords.dependentRequired,
  "enum": draft07Keywords.enum,
  "exclusiveMaximum": draft07Keywords.exclusiveMaximum,
  "exclusiveMinimum": draft07Keywords.exclusiveMinimum,
  "maxItems": draft07Keywords.maxItems,
  "maxLength": draft07Keywords.maxLength,
  "maxProperties": draft07Keywords.maxProperties,
  "maximum": draft07Keywords.maximum,
  "minItems": draft07Keywords.minItems,
  "minLength": draft07Keywords.minLength,
  "minProperties": draft07Keywords.minProperties,
  "minimum": draft07Keywords.minimum,
  "multipleOf": draft07Keywords.multipleOf,
  "pattern": draft07Keywords.pattern,
  "required": draft07Keywords.required,
  "type": draft07Keywords.type,
  "uniqueItems": draft07Keywords.uniqueItems
});
