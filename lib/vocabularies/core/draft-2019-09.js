const { JsonSchema, Schema, Keywords } = require("@hyperjump/json-schema-core");

const metaSchema = require("./meta/draft-2019-09.json");

const defs = require("./keywords/defs");
const recuriveRef = require("./keywords/recursiveRef");
const ref = require("./keywords/ref");


Schema.add(metaSchema);
JsonSchema.addVocabulary("https://json-schema.org/draft/2019-09/vocab/core", {
  "$comment": Keywords.metaData,
  "$defs": defs,
  "$recursiveRef": recuriveRef,
  "$ref": ref
});
