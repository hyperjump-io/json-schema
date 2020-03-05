const Core = require("../../core");
const Schema = require("../../schema");

const metaSchema = require("./meta/draft-2019-09.json");

const defs = require("./keywords/defs");
const metaData = require("../../keywords/meta-data");
const recuriveRef = require("./keywords/recursiveRef");
const ref = require("./keywords/ref");


Schema.add(metaSchema);
Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/core", {
  "$comment": metaData,
  "$defs": defs,
  "$recursiveRef": recuriveRef,
  "$ref": ref
});
