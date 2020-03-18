const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("../meta/meta/meta-data.schema.json");
const keywords = require("../../keywords");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/meta-data", {
  "default": keywords.metaData,
  "deprecated": keywords.metaData,
  "description": keywords.metaData,
  "examples": keywords.metaData,
  "readOnly": keywords.metaData,
  "title": keywords.metaData,
  "writeOnly": keywords.metaData
});
