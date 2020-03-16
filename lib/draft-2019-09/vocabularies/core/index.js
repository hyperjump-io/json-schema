const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/core.json");
const draft07Keywords = require("../../../draft-07/keywords");
const keywords = require("./keywords");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/core", {
  "$comment": Keywords.metaData,
  "$defs": draft07Keywords.definitions,
  "$recursiveRef": keywords.$recursiveRef,
  "$ref": keywords.$ref
});
