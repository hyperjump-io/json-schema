const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/draft-2019-09.json");

const additionalItems = require("./keywords/additionalItems");
const additionalProperties = require("./keywords/additionalProperties");
const allOf = require("./keywords/allOf");
const anyOf = require("./keywords/anyOf");
const contains = require("./keywords/contains");
const dependentSchemas = require("./keywords/dependentSchemas");
const ifThenElse = require("./keywords/if-then-else");
const items = require("./keywords/items");
const not = require("./keywords/not");
const oneOf = require("./keywords/oneOf");
const patternProperties = require("./keywords/patternProperties");
const properties = require("./keywords/properties");
const propertyNames = require("./keywords/propertyNames");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/applicator", {
  "additionalItems": additionalItems,
  "additionalProperties": additionalProperties,
  "allOf": allOf,
  "anyOf": anyOf,
  "contains": contains,
  "dependentSchemas": dependentSchemas,
  "if": ifThenElse,
  "items": items,
  "not": not,
  "oneOf": oneOf,
  "patternProperties": patternProperties,
  "properties": properties,
  "propertyNames": propertyNames
});
