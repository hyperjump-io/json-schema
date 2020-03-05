const Core = require("../../core");
const Schema = require("../../schema");

const metaSchema = require("./meta/draft-2019-09.json");

const metaData = require("../../keywords/meta-data");


Schema.add(metaSchema);
Core.addVocabulary("https://json-schema.org/draft/2019-09/vocab/meta-data", {
  "default": metaData,
  "deprecated": metaData,
  "description": metaData,
  "examples": metaData,
  "readOnly": metaData,
  "title": metaData,
  "writeOnly": metaData
});
