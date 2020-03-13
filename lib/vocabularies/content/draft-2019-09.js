const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/draft-2019-09.json");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/content", {
  "contentEncoding": Keywords.metaData,
  "contentMediaType": Keywords.metaData,
  "contentSchema": Keywords.metaData
});
