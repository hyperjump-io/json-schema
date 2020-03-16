const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/content.json");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/content", {
  "contentEncoding": Keywords.metaData,
  "contentMediaType": Keywords.metaData,
  "contentSchema": Keywords.metaData
});
