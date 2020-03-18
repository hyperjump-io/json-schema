const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");
const keywords = require("../../keywords");

const metaSchema = require("../meta/meta/content.schema.json");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/content", {
  "contentEncoding": keywords.metaData,
  "contentMediaType": keywords.metaData,
  "contentSchema": keywords.metaData
});
