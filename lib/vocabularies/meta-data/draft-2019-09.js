const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/draft-2019-09.json");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/meta-data", {
  "default": Keywords.metaData,
  "deprecated": Keywords.metaData,
  "description": Keywords.metaData,
  "examples": Keywords.metaData,
  "readOnly": Keywords.metaData,
  "title": Keywords.metaData,
  "writeOnly": Keywords.metaData
});
