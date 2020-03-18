const { JsonSchema, Schema } = require("@hyperjump/json-schema-core");

const metaSchema = require("../meta/meta/core.schema.json");
const keywords = require("../../keywords");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/core", {
  "$comment": keywords.metaData,
  "$defs": keywords.definitions,
  "$recursiveRef": keywords.$recursiveRef,
  "$ref": keywords.$ref
});
